import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { DataSource, QueryRunner } from 'typeorm';
import { createHash, randomUUID } from 'node:crypto';
import { CryptoService } from '../common/services/crypto.service.js';
import type { AppRole } from './decorators/roles.decorator.js';
import type { AuthenticatedUser } from './interfaces/authenticated-user.js';

type UserRow = {
  id: string;
  nombre: string;
  correo: string;
  hash_password: string | null;
  modo_activo: AuthenticatedUser['modoActivo'];
  estado: string;
  bloqueado_login_hasta: Date | null;
  intentos_fallidos: number;
};

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    nombre: string;
    correo: string;
    roles: AppRole[];
    modoActivo: AuthenticatedUser['modoActivo'];
  };
};

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly maxAttempts: number;
  private readonly lockMinutes: number;
  private readonly refreshTtlDays: number;
  private dummyPasswordHash!: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly crypto: CryptoService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.maxAttempts = config.get<number>('LOGIN_MAX_ATTEMPTS', 5);
    this.lockMinutes = config.get<number>('LOGIN_LOCK_MINUTES', 15);
    this.refreshTtlDays = config.get<number>('REFRESH_TOKEN_TTL_DAYS', 30);
  }

  async onModuleInit(): Promise<void> {
    this.dummyPasswordHash = await this.crypto.hashPassword(
      'trekko-invalid-login-comparison',
    );
  }

  async register(input: {
    nombre: string;
    correo: string;
    password: string;
  }): Promise<AuthResponse> {
    const nombre = input.nombre.trim();
    if (!nombre) {
      throw new HttpException(
        { code: 'VALIDATION_ERROR', message: 'Name must not be empty' },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (Buffer.byteLength(input.password, 'utf8') > 72) {
      throw new HttpException(
        { code: 'VALIDATION_ERROR', message: 'Password is too long' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const id = randomUUID();
    const passwordHash = await this.crypto.hashPassword(input.password);
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.query(
          `INSERT INTO usuario (id, nombre, correo, hash_password)
           VALUES ($1, $2, $3, $4)`,
          [id, nombre, input.correo.trim().toLowerCase(), passwordHash],
        );
        await manager.query(
          `INSERT INTO usuario_rol (usuario_id, rol) VALUES ($1, 'explorador')`,
          [id],
        );
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException({
          code: 'EMAIL_IN_USE',
          message: 'Email is already registered',
        });
      }
      throw error;
    }
    return this.createSession({
      id,
      nombre,
      correo: input.correo.trim().toLowerCase(),
      modoActivo: 'explorador',
      roles: ['explorador'],
    });
  }

  async login(input: {
    correo: string;
    password: string;
    dispositivo?: string;
    ip?: string;
  }): Promise<AuthResponse> {
    const rows = (await this.dataSource.query(
      `SELECT id, nombre, correo, hash_password, modo_activo, estado,
              intentos_fallidos, bloqueado_login_hasta
       FROM usuario WHERE correo = $1 LIMIT 1`,
      [input.correo.trim().toLowerCase()],
    )) as UserRow[];
    const user = rows[0];
    if (user?.bloqueado_login_hasta && user.bloqueado_login_hasta > new Date()) {
      throw new HttpException(
        { code: 'ACCOUNT_LOCKED', message: 'Account temporarily locked' },
        HttpStatus.LOCKED,
      );
    }

    const passwordHash = user?.hash_password ?? this.dummyPasswordHash;
    const passwordMatches = await this.crypto.comparePassword(
      input.password,
      passwordHash,
    );
    const passwordOk =
      Buffer.byteLength(input.password, 'utf8') <= 72 &&
      user?.hash_password !== null &&
      user?.hash_password !== undefined &&
      passwordMatches;
    if (!user || !passwordOk || user.estado !== 'activo') {
      if (user && user.estado === 'activo') {
        await this.recordFailedLogin(user);
      }
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    await this.dataSource.query(
      `UPDATE usuario
       SET intentos_fallidos = 0, bloqueado_login_hasta = NULL
       WHERE id = $1`,
      [user.id],
    );
    const roles = await this.loadRoles(user.id);
    return this.createSession(
      {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,
        modoActivo: user.modo_activo,
        roles,
      },
      input.dispositivo,
      input.ip,
    );
  }

  async refresh(
    refreshToken: string,
    dispositivo?: string,
    ip?: string,
  ): Promise<AuthResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    let response: AuthResponse | undefined;
    let reused = false;
    try {
      const digest = this.hashToken(refreshToken);
      const rows = (await queryRunner.query(
        `SELECT id, usuario_id, familia_id, expira_en, revocado_en, reemplazado_por
         FROM refresh_token WHERE token_hash = $1 FOR UPDATE`,
        [digest],
      )) as Array<{
        id: string;
        usuario_id: string;
        familia_id: string;
        expira_en: Date;
        revocado_en: Date | null;
        reemplazado_por: string | null;
      }>;
      const token = rows[0];
      if (token?.revocado_en && token.reemplazado_por) {
        await queryRunner.query(
          `UPDATE refresh_token SET revocado_en = COALESCE(revocado_en, now())
           WHERE familia_id = $1`,
          [token.familia_id],
        );
        reused = true;
      } else if (
        !token ||
        token.revocado_en ||
        new Date(token.expira_en) <= new Date()
      ) {
        await queryRunner.commitTransaction();
        throw new UnauthorizedException({
          code: 'UNAUTHORIZED',
          message: 'Invalid refresh token',
        });
      } else {
        const users = (await queryRunner.query(
          `SELECT id, nombre, correo, modo_activo, estado FROM usuario WHERE id = $1`,
          [token.usuario_id],
        )) as Array<{
          id: string;
          nombre: string;
          correo: string;
          modo_activo: AuthenticatedUser['modoActivo'];
          estado: string;
        }>;
        const user = users[0];
        if (!user || user.estado !== 'activo') {
          await queryRunner.commitTransaction();
          throw new UnauthorizedException({
            code: 'UNAUTHORIZED',
            message: 'Invalid refresh token',
          });
        }

        const roles = await this.loadRoles(user.id, queryRunner);
        const nextToken = this.newRefreshToken();
        const nextId = randomUUID();
        await queryRunner.query(
          `INSERT INTO refresh_token
             (id, usuario_id, familia_id, token_hash, expira_en, dispositivo, ip)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            nextId,
            user.id,
            token.familia_id,
            this.hashToken(nextToken),
            this.refreshExpiry(),
            dispositivo ?? null,
            ip ?? null,
          ],
        );
        await queryRunner.query(
          `UPDATE refresh_token SET revocado_en = now(), reemplazado_por = $2
           WHERE id = $1`,
          [token.id, nextId],
        );
        response = await this.createAccessResponse({ ...user, roles }, nextToken);
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
    if (reused) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Refresh token reuse detected',
      });
    }
    if (!response) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid refresh token',
      });
    }
    return response;
  }

  async logout(userId: string, refreshToken: string, all: boolean): Promise<void> {
    const digest = this.hashToken(refreshToken);
    const rows = (await this.dataSource.query(
      `SELECT id, familia_id FROM refresh_token
       WHERE token_hash = $1 AND usuario_id = $2`,
      [digest, userId],
    )) as Array<{ id: string; familia_id: string }>;
    const token = rows[0];
    if (!token) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid refresh token',
      });
    }
    await this.dataSource.query(
      all
        ? `UPDATE refresh_token SET revocado_en = COALESCE(revocado_en, now())
           WHERE familia_id = $1`
        : `UPDATE refresh_token SET revocado_en = COALESCE(revocado_en, now())
           WHERE id = $1`,
      [all ? token.familia_id : token.id],
    );
  }

  async me(userId: string) {
    const rows = (await this.dataSource.query(
      `SELECT id, nombre, correo, modo_activo, reputacion, puntos_saldo,
              perfil_verificado
       FROM usuario WHERE id = $1 AND estado = 'activo'`,
      [userId],
    )) as Array<{
      id: string;
      nombre: string;
      correo: string;
      modo_activo: AuthenticatedUser['modoActivo'];
      reputacion: number;
      puntos_saldo: number;
      perfil_verificado: boolean;
    }>;
    const user = rows[0];
    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'User is not available',
      });
    }
    return {
      id: user.id,
      nombre: user.nombre,
      correo: user.correo,
      modoActivo: user.modo_activo,
      roles: await this.loadRoles(userId),
      reputacion: user.reputacion,
      puntosSaldo: user.puntos_saldo,
      perfilVerificado: user.perfil_verificado,
    };
  }

  private async createSession(
    user: {
      id: string;
      nombre: string;
      correo: string;
      modoActivo: AuthenticatedUser['modoActivo'];
      roles: AppRole[];
    },
    dispositivo?: string,
    ip?: string,
  ): Promise<AuthResponse> {
    const refreshToken = this.newRefreshToken();
    await this.dataSource.query(
      `INSERT INTO refresh_token
         (id, usuario_id, familia_id, token_hash, expira_en, dispositivo, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        randomUUID(),
        user.id,
        randomUUID(),
        this.hashToken(refreshToken),
        this.refreshExpiry(),
        dispositivo ?? null,
        ip ?? null,
      ],
    );
    return this.createAccessResponse(user, refreshToken);
  }

  private async createAccessResponse(
    user: {
      id: string;
      nombre: string;
      correo: string;
      modo_activo?: AuthenticatedUser['modoActivo'];
      modoActivo?: AuthenticatedUser['modoActivo'];
      roles: AppRole[];
    },
    refreshToken: string,
  ): Promise<AuthResponse> {
    const modoActivo = user.modoActivo ?? user.modo_activo ?? 'explorador';
    const claims: Omit<AuthenticatedUser, 'jti'> = {
      sub: user.id,
      roles: user.roles,
      modoActivo,
    };
    const accessToken = await this.jwt.signAsync(claims, {
      jwtid: randomUUID(),
    } as JwtSignOptions);
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,
        roles: user.roles,
        modoActivo,
      },
    };
  }

  private async loadRoles(
    userId: string,
    queryRunner?: QueryRunner,
  ): Promise<AppRole[]> {
    const query = `SELECT rol FROM usuario_rol WHERE usuario_id = $1 ORDER BY rol`;
    const rows = (queryRunner
      ? await queryRunner.query(query, [userId])
      : await this.dataSource.query(query, [userId])) as Array<{
      rol: AppRole;
    }>;
    return rows.map(({ rol }) => rol);
  }

  private async recordFailedLogin(user: UserRow): Promise<void> {
    const rows = (await this.dataSource.query(
      `UPDATE usuario
       SET intentos_fallidos = intentos_fallidos + 1,
           bloqueado_login_hasta = CASE WHEN intentos_fallidos + 1 >= $2
             THEN now() + ($3 * interval '1 minute')
             ELSE NULL END
       WHERE id = $1
       RETURNING intentos_fallidos`,
      [user.id, this.maxAttempts, this.lockMinutes],
    )) as Array<{ intentos_fallidos: number }>;
    if (Number(rows[0]?.intentos_fallidos ?? 0) >= this.maxAttempts) {
      throw new HttpException(
        { code: 'ACCOUNT_LOCKED', message: 'Account temporarily locked' },
        HttpStatus.LOCKED,
      );
    }
  }

  private newRefreshToken(): string {
    return this.crypto.randomToken(32);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  private refreshExpiry(): Date {
    return new Date(Date.now() + this.refreshTtlDays * 24 * 60 * 60 * 1000);
  }

  private isUniqueViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('driverError' in error)) {
      return false;
    }
    const driverError = error.driverError;
    return (
      typeof driverError === 'object' &&
      driverError !== null &&
      'code' in driverError &&
      driverError.code === '23505'
    );
  }
}
