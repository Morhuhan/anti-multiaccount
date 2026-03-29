import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  Model,
  NonAttribute,
} from 'sequelize'

import { sequelize } from '../lib/db'

export const fingerprintEventTypes = [
  'register',
  'login',
  'promo_activation',
  'activity',
] as const

export type FingerprintEventType = (typeof fingerprintEventTypes)[number]

export class User extends Model<
  InferAttributes<User, { omit: 'authAccounts' | 'fingerprints' }>,
  InferCreationAttributes<User, { omit: 'id' | 'createdAt' | 'authAccounts' | 'fingerprints' }>
> {
  declare id: CreationOptional<number>
  declare email: string
  declare name: string | null
  declare createdAt: CreationOptional<Date>

  declare authAccounts?: NonAttribute<UserAuthAccount[]>
  declare fingerprints?: NonAttribute<UserFingerprint[]>
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'User',
    updatedAt: false,
  },
)

export class UserAuthAccount extends Model<
  InferAttributes<UserAuthAccount, { omit: 'user' }>,
  InferCreationAttributes<UserAuthAccount, { omit: 'id' | 'createdAt' | 'user' }>
> {
  declare id: CreationOptional<number>
  declare userId: number
  declare provider: string
  declare providerAccountId: string
  declare createdAt: CreationOptional<Date>

  declare user?: NonAttribute<User>
}

UserAuthAccount.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    provider: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    providerAccountId: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'UserAuthAccount',
    updatedAt: false,
    indexes: [
      { fields: ['userId'] },
      { fields: ['provider', 'providerAccountId'] },
    ],
  },
)

export class UserFingerprint extends Model<
  InferAttributes<UserFingerprint, { omit: 'user' }>,
  InferCreationAttributes<UserFingerprint, { omit: 'id' | 'createdAt' | 'user' }>
> {
  declare id: CreationOptional<number>
  declare userId: number
  declare eventType: FingerprintEventType
  declare fHash: string | null
  declare ipPrimary: string | null
  declare ipWebrtc: string | null
  declare canvasId: string | null
  declare audioId: string | null
  declare webglVendor: string | null
  declare webglRenderer: string | null
  declare webglId: string | null
  declare cookieId: string | null
  declare affiliateId: string | null
  declare registrationSpeedMs: number | null
  declare payload: unknown
  declare createdAt: CreationOptional<Date>

  declare user?: NonAttribute<User>
}

UserFingerprint.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    eventType: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    fHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    ipPrimary: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    ipWebrtc: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    canvasId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    audioId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    webglVendor: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    webglRenderer: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    webglId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    cookieId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    affiliateId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    registrationSpeedMs: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'UserFingerprint',
    updatedAt: false,
    indexes: [
      { fields: ['userId'] },
      { fields: ['fHash'] },
      { fields: ['cookieId'] },
      { fields: ['ipPrimary'] },
      { fields: ['ipWebrtc'] },
      { fields: ['createdAt'] },
      { fields: ['canvasId', 'audioId', 'webglId'] },
      { fields: ['ipPrimary', 'ipWebrtc'] },
      { fields: ['ipPrimary', 'affiliateId'] },
    ],
  },
)

User.hasMany(UserAuthAccount, {
  // Внешние аккаунты пользователя
  foreignKey: 'userId',
  as: 'authAccounts',
})
UserAuthAccount.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
})

User.hasMany(UserFingerprint, {
  // История отпечатков пользователя
  foreignKey: 'userId',
  as: 'fingerprints',
})
UserFingerprint.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
})
