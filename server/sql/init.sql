CREATE TABLE IF NOT EXISTS `User` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`)
);

CREATE TABLE IF NOT EXISTS `UserAuthAccount` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `provider` VARCHAR(64) NOT NULL,
  `providerAccountId` VARCHAR(255) NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `UserAuthAccount_userId_idx` (`userId`),
  KEY `UserAuthAccount_provider_providerAccountId_idx` (`provider`, `providerAccountId`),
  CONSTRAINT `UserAuthAccount_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `UserFingerprint` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `eventType` VARCHAR(64) NOT NULL,
  `fHash` VARCHAR(255) NULL,
  `ipPrimary` VARCHAR(64) NULL,
  `ipWebrtc` VARCHAR(64) NULL,
  `canvasId` VARCHAR(255) NULL,
  `audioId` VARCHAR(255) NULL,
  `webglVendor` VARCHAR(255) NULL,
  `webglRenderer` VARCHAR(255) NULL,
  `webglId` VARCHAR(255) NULL,
  `cookieId` VARCHAR(255) NULL,
  `affiliateId` VARCHAR(255) NULL,
  `registrationSpeedMs` INT NULL,
  `payload` JSON NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `UserFingerprint_userId_idx` (`userId`),
  KEY `UserFingerprint_fHash_idx` (`fHash`),
  KEY `UserFingerprint_cookieId_idx` (`cookieId`),
  KEY `UserFingerprint_ipPrimary_idx` (`ipPrimary`),
  KEY `UserFingerprint_ipWebrtc_idx` (`ipWebrtc`),
  KEY `UserFingerprint_createdAt_idx` (`createdAt`),
  KEY `UserFingerprint_canvasId_audioId_webglId_idx` (`canvasId`, `audioId`, `webglId`),
  KEY `UserFingerprint_ipPrimary_ipWebrtc_idx` (`ipPrimary`, `ipWebrtc`),
  KEY `UserFingerprint_ipPrimary_affiliateId_idx` (`ipPrimary`, `affiliateId`),
  CONSTRAINT `UserFingerprint_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE
);
