"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRelatedAccounts = getRelatedAccounts;
exports.getAnalyticsRelationships = getAnalyticsRelationships;
const sequelize_1 = require("sequelize");
const models_1 = require("../models");
const errors_1 = require("../utils/errors");
const http_1 = require("../utils/http");
const RULE_WEIGHTS = {
    f_hash: 100,
    cookie_id: 100,
    device_stack: 80,
    network_signature: 50,
    affiliate_overlap: 30,
    auth_provider_account: 100,
};
const RULE_REASON_MAP = {
    f_hash: ['f_hash'],
    cookie_id: ['cookie_id'],
    device_stack: ['canvas', 'audio', 'webgl'],
    network_signature: ['ip_primary', 'ip_webrtc', 'user_agent'],
    affiliate_overlap: ['ip_primary', 'affiliate_id'],
    auth_provider_account: ['auth_provider_account'],
};
function parseFingerprintPayload(value) {
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        }
        catch {
            return {};
        }
    }
    return value ?? {};
}
function getUserAgentFingerprint(entry) {
    const payload = parseFingerprintPayload(entry.payload);
    const fingerprint = payload.fingerprint;
    const userAgent = fingerprint?.userAgent;
    return typeof userAgent === 'string' && userAgent.length > 0 ? userAgent : undefined;
}
function applyRule(candidate, ruleKey, otherFingerprintId, otherCreatedAt) {
    candidate.matchedRuleKeys.add(ruleKey);
    candidate.matchedEventIds.add(otherFingerprintId);
    for (const reason of RULE_REASON_MAP[ruleKey]) {
        candidate.matchReasonSet.add(reason);
    }
    if (otherCreatedAt > candidate.lastMatchedAt) {
        candidate.lastMatchedAt = otherCreatedAt;
    }
}
function evaluateFingerprintPair(currentFingerprint, otherFingerprint, candidate) {
    // Exact identifiers are treated as strongest evidence and score immediately.
    if (currentFingerprint.fHash &&
        otherFingerprint.fHash &&
        currentFingerprint.fHash === otherFingerprint.fHash) {
        applyRule(candidate, 'f_hash', otherFingerprint.id, otherFingerprint.createdAt);
    }
    if (currentFingerprint.cookieId &&
        otherFingerprint.cookieId &&
        currentFingerprint.cookieId === otherFingerprint.cookieId) {
        applyRule(candidate, 'cookie_id', otherFingerprint.id, otherFingerprint.createdAt);
    }
    const currentWebglId = (0, http_1.buildWebglId)(currentFingerprint.webglVendor ?? undefined, currentFingerprint.webglRenderer ?? undefined);
    const otherWebglId = (0, http_1.buildWebglId)(otherFingerprint.webglVendor ?? undefined, otherFingerprint.webglRenderer ?? undefined);
    if (currentFingerprint.canvasId &&
        otherFingerprint.canvasId &&
        currentFingerprint.canvasId === otherFingerprint.canvasId &&
        currentFingerprint.audioId &&
        otherFingerprint.audioId &&
        currentFingerprint.audioId === otherFingerprint.audioId &&
        currentWebglId &&
        otherWebglId &&
        currentWebglId === otherWebglId &&
        currentFingerprint.ipPrimary &&
        otherFingerprint.ipPrimary &&
        currentFingerprint.ipPrimary !== otherFingerprint.ipPrimary) {
        applyRule(candidate, 'device_stack', otherFingerprint.id, otherFingerprint.createdAt);
    }
    const currentUserAgent = getUserAgentFingerprint(currentFingerprint);
    const otherUserAgent = getUserAgentFingerprint(otherFingerprint);
    // Network signature is intentionally weaker than hard device matches because
    // shared IPs can otherwise produce noisy links.
    if (currentFingerprint.ipPrimary &&
        otherFingerprint.ipPrimary &&
        currentFingerprint.ipPrimary === otherFingerprint.ipPrimary &&
        currentFingerprint.ipWebrtc &&
        otherFingerprint.ipWebrtc &&
        currentFingerprint.ipWebrtc === otherFingerprint.ipWebrtc &&
        currentUserAgent &&
        otherUserAgent &&
        currentUserAgent === otherUserAgent) {
        applyRule(candidate, 'network_signature', otherFingerprint.id, otherFingerprint.createdAt);
    }
    if (currentFingerprint.ipPrimary &&
        otherFingerprint.ipPrimary &&
        currentFingerprint.ipPrimary === otherFingerprint.ipPrimary &&
        currentFingerprint.affiliateId &&
        otherFingerprint.affiliateId &&
        currentFingerprint.affiliateId === otherFingerprint.affiliateId) {
        applyRule(candidate, 'affiliate_overlap', otherFingerprint.id, otherFingerprint.createdAt);
    }
}
function calculateConfidenceScore(matchedRuleKeys) {
    let score = 0;
    for (const ruleKey of matchedRuleKeys) {
        score = Math.max(score, RULE_WEIGHTS[ruleKey]);
    }
    return score;
}
function groupByUserId(items) {
    const grouped = new Map();
    for (const item of items) {
        const existing = grouped.get(item.userId);
        if (existing) {
            existing.push(item);
        }
        else {
            grouped.set(item.userId, [item]);
        }
    }
    return grouped;
}
async function getRelatedAccounts(userId) {
    const user = await models_1.User.findByPk(userId);
    if (!user) {
        throw new errors_1.ApiError(404, 'User not found');
    }
    // Data is loaded in bulk once so pairwise scoring works in memory without
    // a cascade of N+1 database roundtrips.
    const [currentFingerprintRows, currentAuthRows, otherUserRows, otherFingerprintRows, otherAuthRows] = await Promise.all([
        models_1.UserFingerprint.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
            raw: true,
        }),
        models_1.UserAuthAccount.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
            raw: true,
        }),
        models_1.User.findAll({
            where: {
                id: {
                    [sequelize_1.Op.ne]: userId,
                },
            },
            order: [['id', 'ASC']],
            raw: true,
        }),
        models_1.UserFingerprint.findAll({
            where: {
                userId: {
                    [sequelize_1.Op.ne]: userId,
                },
            },
            order: [['createdAt', 'DESC']],
            raw: true,
        }),
        models_1.UserAuthAccount.findAll({
            where: {
                userId: {
                    [sequelize_1.Op.ne]: userId,
                },
            },
            order: [['createdAt', 'DESC']],
            raw: true,
        }),
    ]);
    const fingerprintsByUserId = groupByUserId(otherFingerprintRows);
    const authAccountsByUserId = groupByUserId(otherAuthRows);
    const ownProviderAccounts = new Set(currentAuthRows.map((account) => `${account.provider.toLowerCase()}::${account.providerAccountId}`));
    const results = [];
    for (const otherUser of otherUserRows) {
        const candidate = {
            related_user_id: otherUser.id,
            matchedRuleKeys: new Set(),
            matchReasonSet: new Set(),
            matchedEventIds: new Set(),
            lastMatchedAt: new Date(0),
        };
        for (const currentFingerprint of currentFingerprintRows) {
            for (const otherFingerprint of fingerprintsByUserId.get(otherUser.id) ?? []) {
                evaluateFingerprintPair(currentFingerprint, otherFingerprint, candidate);
            }
        }
        for (const account of authAccountsByUserId.get(otherUser.id) ?? []) {
            const composite = `${account.provider.toLowerCase()}::${account.providerAccountId}`;
            if (ownProviderAccounts.has(composite)) {
                applyRule(candidate, 'auth_provider_account', Number.MIN_SAFE_INTEGER + account.id, account.createdAt);
            }
        }
        if (candidate.matchedRuleKeys.size > 0) {
            results.push(candidate);
        }
    }
    return results
        .map((candidate) => ({
        related_user_id: candidate.related_user_id,
        confidence_score: calculateConfidenceScore(candidate.matchedRuleKeys),
        match_reasons: [...candidate.matchReasonSet].sort(),
        matched_events_count: candidate.matchedEventIds.size,
        last_matched_at: candidate.lastMatchedAt.toISOString(),
    }))
        .sort((left, right) => {
        if (right.confidence_score !== left.confidence_score) {
            return right.confidence_score - left.confidence_score;
        }
        return (new Date(right.last_matched_at).getTime() -
            new Date(left.last_matched_at).getTime());
    });
}
async function getAnalyticsRelationships() {
    const [users, fingerprintCountsResult] = await Promise.all([
        models_1.User.findAll({
            order: [['id', 'ASC']],
            raw: true,
        }),
        models_1.UserFingerprint.findAll({
            attributes: ['userId', [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'fingerprintCount']],
            group: ['userId'],
            raw: true,
        }),
    ]);
    const fingerprintCountsRaw = fingerprintCountsResult;
    const fingerprintCounts = new Map(fingerprintCountsRaw.map((row) => [Number(row.userId), Number(row.fingerprintCount)]));
    const enriched = await Promise.all(users.map(async (user) => {
        const relatedAccounts = await getRelatedAccounts(user.id);
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt.toISOString(),
            fingerprintCount: fingerprintCounts.get(user.id) ?? 0,
            relatedAccountsCount: relatedAccounts.length,
            topConfidenceScore: relatedAccounts[0]?.confidence_score ?? 0,
        };
    }));
    return { users: enriched };
}
//# sourceMappingURL=relatedAccountsService.js.map