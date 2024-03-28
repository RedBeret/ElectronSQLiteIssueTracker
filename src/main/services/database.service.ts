import 'reflect-metadata';
import 'sqlite3';
import sqlFormatter from '@sqltools/formatter';
import { Config as SQLFormatterConfig } from '@sqltools/formatter/lib/core/types';
import getCurrentLine from 'get-current-line';
import { Knex } from 'knex';
import { whereFilter } from 'knex-json-filter';
import SchemaInspector from 'knex-schema-inspector';
import { SchemaInspector as ISchemaInspector } from 'knex-schema-inspector/lib/types/schema-inspector';
import _ from 'lodash';
import { Overwrite } from 'ts-toolbelt/out/Object/Overwrite';
import { Inject, Service } from 'typedi';
import {
  ConnectArguments,
  ConnectionConfig,
  DeleteDataArguments,
  ErrorType,
  InsertDataArguments,
  IPCError,
  QueryAggregate,
  QueryJoin,
  QueryOrder,
  QueryWhere,
  ReadDataArguments,
  ReadDataResult,
  ReadWidgetDataArguments,
  ReadWidgetDataResult,
  ServerConnectionConfig,
  ServerType,
  SSHTunnelConfig,
  TableInfoRow,
  UpdateDataArguments,
  QueryAggregateEnum,
  ServerTypeEnum,
} from '@electrocrud/shared';
import { heartBeatQueries } from '../data/queries';
import { NoActiveClientError, NoConnectionError } from '../exceptions';
import { configurationNegotiation, connect } from '../helpers/database';
import { IDatabaseService } from './interfaces/idatabase.service';
import { ILogService } from './interfaces/ilog.service';
import {
  ITunnelService,
  TunnelProxyConfig,
} from './interfaces/itunnel.service';

const formatterParameters: SQLFormatterConfig = {
  reservedWordCase: 'upper',
  indent: '    ',
  language: 'sql',
};

type KnexConfigType = Overwrite<
  Knex.Config,
  {
    connection: ConnectionConfig;
  }
>;

@Service({ global: true, id: 'service.database' })
class DatabaseService implements IDatabaseService {
  private config?: KnexConfigType;

  private connection?: Knex;

  private inspector?: ISchemaInspector;

  @Inject('service.log')
  private logService: ILogService;

  @Inject('service.tunnel')
  private tunnelService: ITunnelService;

  public async connect(
    client: ServerTypeEnum,
    connection: ConnectionConfig,
    tunnel?: SSHTunnelConfig
  ): Promise<boolean | IPCError> {
    await this.disconnect();

    let connectionOverride = {};

    try {
      if (tunnel && tunnel.enabled) {
        this.tunnelService.init(
          tunnel.host,
          tunnel.port,
          tunnel.username,
          tunnel.password
        );

        const tunnelLink: TunnelProxyConfig | undefined =
          await this.tunnelService.start(
            (connection as ServerConnectionConfig).host as string,
            (connection as ServerConnectionConfig).port
          );

        if (tunnelLink && tunnelLink.localPort) {
          this.logService.success(
            `SSH Tunnel: ${JSON.stringify(tunnelLink)}`,
            getCurrentLine().method
          );
          connectionOverride = {
            port: tunnelLink.localPort,
            host: tunnel.host,
          };
        }
      }

      this.config = {
        client,
        connection: configurationNegotiation(client, {
          ...connection,
          ...connectionOverride,
        }),
        useNullAsDefault: true,
      };
      this.logService.info(
        `Connecting (${this.config.client}): ${JSON.stringify(
          _.omit(this.config.connection, ['password', 'user'])
        )}`,
        getCurrentLine().method
      );

      this.connection = connect(this.config, {
        warn(message) {
          this.logService.warning(message);
        },
        error(message) {
          this.logService.error(message);
        },
        debug(message) {
          this.logService.debug(message);
        },
      });
      this.inspector = SchemaInspector(this.connection);
      if (
        this.inspector &&
        (this.config.connection as ServerConnectionConfig).schema
      ) {
        this.inspector.withSchema(
          (this.config.connection as ServerConnectionConfig).schema
        );
      }
      const result = await this.heartbeat();
      this.logService.success(`Connection Success`, getCurrentLine().method);
      return result;
    } catch (error: any) {
      this.logService.error(error.message, getCurrentLine().method);
      this.logService.error(JSON.stringify(error));
      throw {
        type: ErrorType.NOT_CONNECTED,
        message: JSON.stringify(error),
      };
    }
  }

  public async connectWithProps(
    properties: ConnectArguments
  ): Promise<boolean | IPCError> {
    const { client, connection, tunnel } = properties;
    return this.connect(client, connection, tunnel);
  }

  public async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.destroy();
    }
  }

  public getConnection(): Knex {
    if (!this.connection) {
      throw new NoConnectionError();
    }
    return this.connection;
  }

  public get activeClient(): ServerType {
    try {
      if (!this.config?.client) {
        throw new NoActiveClientError();
      }
      return this.config.client as ServerType;
    } catch {
      throw new NoActiveClientError();
    }
  }

  public async heartbeat(): Promise<boolean | IPCError> {
    const heartbeatQuery = heartBeatQueries[this.activeClient];

    try {
      await this.connection?.raw(heartbeatQuery);
      return true;
    } catch (error: any) {
      this.logService.error(error?.message, getCurrentLine().method);
      throw {
        type: ErrorType.NOT_CONNECTED,
        message: JSON.stringify(error),
      };
    }
  }

  public async heartbeatWithProps(): Promise<boolean | IPCError> {
    return this.heartbeat();
  }
}

export default DatabaseService;
