export function getPublicStatusLabel(item = {}, kind = 'document') {
  if (!item) return '待企业补充';

  const status = item.status || item.rawStatus || item.companyStatus || '';
  const reviewStatus = item.review_status || item.reviewStatus || '';
  const verificationStatus = item.verification_status || item.verificationStatus || '';
  const publicVisible = item.public_visible ?? item.publicVisible;

  if (kind === 'company') {
    if ((verificationStatus === 'verified' || status === '已认证') && publicVisible !== 0) return '已公开';
    if (verificationStatus === 'pending' || status === 'draft') return '暂未公开';
    return '待企业补充';
  }

  if (kind === 'product') {
    if (status === 'active' || status === '公开') return '已公开';
    if (status === 'draft' || status === 'inactive') return '暂未公开';
    return '待企业补充';
  }

  if (status === 'deleted') return '暂未公开';
  if (reviewStatus === 'approved' || status === 'active') return '已公开';
  if (reviewStatus === 'pending' || reviewStatus === 'rejected') return '暂未公开';
  return '待企业补充';
}
