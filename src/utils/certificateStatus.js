/**
 * 证书状态计算工具
 * 用于判断证书的详细状态和过期倒计时
 */

/**
 * 计算两个日期之间的天数差
 * @param {Date} date1
 * @param {Date} date2
 * @returns {number} 天数差
 */
function getDaysDifference(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((date2 - date1) / oneDay);
}

/**
 * 获取证书的详细状态
 * @param {string} status - 证书状态 (active/expired/revoked)
 * @param {string} expiryDate - 过期日期字符串
 * @returns {Object} { status, daysRemaining, statusText, statusColor }
 */
export function getCertificateStatus(status, expiryDate) {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // 重置时间为当天开始

  // 已撤销
  if (status === 'revoked') {
    return {
      status: 'revoked',
      daysRemaining: null,
      statusText: 'revoked',
      statusColor: 'gray',
      severity: 'high'
    };
  }

  // 已过期
  if (status === 'expired') {
    return {
      status: 'expired',
      daysRemaining: 0,
      statusText: 'expired',
      statusColor: 'red',
      severity: 'high'
    };
  }

  // 计算剩余天数
  if (expiryDate) {
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const daysRemaining = getDaysDifference(now, expiry);

    // 已过期（但数据库状态未更新）
    if (daysRemaining < 0) {
      return {
        status: 'expired',
        daysRemaining: 0,
        statusText: 'expired',
        statusColor: 'red',
        severity: 'high'
      };
    }

    // 即将过期（30天内）
    if (daysRemaining <= 30) {
      return {
        status: 'expiring',
        daysRemaining,
        statusText: 'expiringSoon',
        statusColor: 'yellow',
        severity: 'medium'
      };
    }

    // 有效
    return {
      status: 'active',
      daysRemaining,
      statusText: 'active',
      statusColor: 'green',
      severity: 'low'
    };
  }

  // 无过期日期，默认为有效
  return {
    status: 'active',
    daysRemaining: null,
    statusText: 'active',
    statusColor: 'green',
    severity: 'low'
  };
}

/**
 * 格式化剩余天数文本
 * @param {number} days - 剩余天数
 * @param {Function} t - 翻译函数
 * @returns {string} 格式化后的文本
 */
export function formatDaysRemaining(days, t) {
  if (days === null) return '';
  if (days === 0) return t('certificate.status.expired');
  if (days === 1) return t('certificate.status.expiresIn1Day');
  if (days <= 30) return t('certificate.status.expiresInDays', { days });
  if (days <= 365) return t('certificate.status.expiresInMonths', { months: Math.floor(days / 30) });
  return t('certificate.status.expiresInYears', { years: Math.floor(days / 365) });
}

/**
 * 获取审核状态信息
 * @param {string} reviewStatus - 审核状态 (pending/approved/rejected)
 * @returns {Object} { text, color, icon }
 */
export function getReviewStatusInfo(reviewStatus) {
  const statusMap = {
    pending: {
      text: 'pending',
      color: 'orange',
      icon: '⏳'
    },
    approved: {
      text: 'approved',
      color: 'green',
      icon: '✓'
    },
    rejected: {
      text: 'rejected',
      color: 'red',
      icon: '✕'
    }
  };

  return statusMap[reviewStatus] || statusMap.pending;
}
