"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserFingerprint = exports.UserAuthAccount = exports.User = exports.fingerprintEventTypes = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../lib/db");
exports.fingerprintEventTypes = [
    'register',
    'login',
    'promo_activation',
    'activity',
];
class User extends sequelize_1.Model {
}
exports.User = User;
User.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    email: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        unique: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
}, {
    sequelize: db_1.sequelize,
    tableName: 'User',
    updatedAt: false,
});
class UserAuthAccount extends sequelize_1.Model {
}
exports.UserAuthAccount = UserAuthAccount;
UserAuthAccount.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    provider: {
        type: sequelize_1.DataTypes.STRING(64),
        allowNull: false,
    },
    providerAccountId: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
}, {
    sequelize: db_1.sequelize,
    tableName: 'UserAuthAccount',
    updatedAt: false,
    indexes: [
        { fields: ['userId'] },
        { fields: ['provider', 'providerAccountId'] },
    ],
});
class UserFingerprint extends sequelize_1.Model {
}
exports.UserFingerprint = UserFingerprint;
UserFingerprint.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    eventType: {
        type: sequelize_1.DataTypes.STRING(64),
        allowNull: false,
    },
    fHash: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
    },
    ipPrimary: {
        type: sequelize_1.DataTypes.STRING(64),
        allowNull: true,
    },
    ipWebrtc: {
        type: sequelize_1.DataTypes.STRING(64),
        allowNull: true,
    },
    canvasId: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
    },
    audioId: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
    },
    webglVendor: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
    },
    webglRenderer: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
    },
    webglId: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
    },
    cookieId: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
    },
    affiliateId: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
    },
    registrationSpeedMs: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    payload: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: false,
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
}, {
    sequelize: db_1.sequelize,
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
});
User.hasMany(UserAuthAccount, {
    foreignKey: 'userId',
    as: 'authAccounts',
});
UserAuthAccount.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
});
User.hasMany(UserFingerprint, {
    foreignKey: 'userId',
    as: 'fingerprints',
});
UserFingerprint.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
});
//# sourceMappingURL=index.js.map