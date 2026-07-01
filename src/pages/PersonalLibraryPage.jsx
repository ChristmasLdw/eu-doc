import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';
import * as api from '../services/api';
import styles from './PersonalLibraryPage.module.css';

const typeOptions = [
  { value: 'all', label: '全部' },
  { value: '公司', label: '公司' },
  { value: '产品', label: '产品' },
  { value: '文件', label: '文件' },
];

const fileTypeOptions = [
  { value: 'all', label: '全部文件' },
  { value: 'certificate', label: '资质证书' },
  { value: 'doc', label: 'DoC 声明' },
  { value: 'manual', label: '说明书' },
  { value: 'report', label: '检测报告' },
];

const rangeOptions = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: 'yesterday', label: '昨天' },
  { value: '7d', label: '近 7 天' },
  { value: '30d', label: '近 30 天' },
  { value: '90d', label: '近 90 天' },
];

function getTargetPath(type, itemId) {
  if (!itemId) return '';
  if (type === '公司') return `/companies/${itemId}`;
  if (type === '产品') return `/products/${itemId}`;
  if (type === '文件') return `/documents/${itemId}`;
  return '';
}

function getToneClass(type) {
  if (type === '公司') return styles.companyTone;
  if (type === '产品') return styles.productTone;
  if (type === '文件') return styles.fileTone;
  return '';
}

function normalizeFileType(item) {
  const raw = String(item.documentType || '').toLowerCase();
  const text = `${item.title || ''} ${item.meta || ''} ${item.description || ''}`.toLowerCase();
  if (['declaration_of_conformity', 'doc', 'declaration'].includes(raw) || /doc|声明|conformity/i.test(text)) return 'doc';
  if (['manual', 'user_manual'].includes(raw) || /说明书|manual|instruction/i.test(text)) return 'manual';
  if (['report', 'test_report'].includes(raw) || /报告|report|test/i.test(text)) return 'report';
  return 'certificate';
}

function parseNote(note = '') {
  const text = String(note || '').trim();
  const match = text.match(/^分组[:：]\s*(.+?)(?:\n|$)/);
  return {
    group: match ? match[1].trim() : '',
    note: match ? text.replace(/^分组[:：].*?(?:\n|$)/, '').trim() : text,
  };
}

function formatNote(group, note) {
  return [group ? `分组：${group}` : '', note || ''].filter(Boolean).join('\n');
}

function parseTime(time) {
  if (!time || time === '刚刚') return Date.now();
  const timestamp = new Date(String(time).replace(' ', 'T')).getTime();
  return Number.isNaN(timestamp) ? Date.now() : timestamp;
}

export default function PersonalLibraryPage({ mode }) {
  const navigate = useNavigate();
  const { admin } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [historyEnabled, setHistoryEnabled] = useState(true);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [rangeFilter, setRangeFilter] = useState('all');
  const [editModal, setEditModal] = useState({ open: false, item: null, group: '未分组', newGroup: '', note: '' });

  const isFavorites = mode === 'favorites';

  useEffect(() => {
    if (!admin) {
      navigate('/admin/login', { replace: true });
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.getPersonalOverview()
      .then((data) => {
        if (cancelled) return;
        setHistoryEnabled(Boolean(data.settings?.historyEnabled ?? true));
        if (isFavorites) {
          setItems((data.favorites || []).map((item) => ({
            id: item.id,
            type: item.itemType,
            itemId: item.itemId,
            title: item.title,
            meta: item.meta || item.companyName || item.productName || '',
            description: item.description || '',
            note: item.note || '',
            status: item.status || '正常',
            statusReason: item.statusReason || '',
            documentType: item.documentType || '',
            fileType: normalizeFileType(item),
            targetPath: getTargetPath(item.itemType, item.itemId),
          })));
        } else {
          setItems((data.history || []).map((item) => ({
            id: item.id,
            type: item.itemType,
            itemId: item.itemId,
            title: item.title,
            company: item.company || '-',
            action: item.actionLabel || '查看',
            time: item.viewedAt || item.createdAt,
            timestamp: parseTime(item.viewedAt || item.createdAt),
            targetPath: getTargetPath(item.itemType, item.itemId),
          })));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [admin, isFavorites, navigate]);

  const stats = useMemo(() => ({
    all: items.length,
    company: items.filter((item) => item.type === '公司').length,
    product: items.filter((item) => item.type === '产品').length,
    file: items.filter((item) => item.type === '文件').length,
  }), [items]);

  const favoriteGroups = useMemo(() => {
    const groups = new Map([['未分组', 0]]);
    items.forEach((item) => {
      if (item.type !== '文件' && item.type !== '产品' && item.type !== '公司') return;
      const group = parseNote(item.note).group || '未分组';
      groups.set(group, (groups.get(group) || 0) + 1);
    });
    return Array.from(groups.entries()).map(([name, count]) => ({ name, count }));
  }, [items]);

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const dayLimit = Number(String(rangeFilter).replace('d', ''));
    const since = Number.isFinite(dayLimit) ? Date.now() - dayLimit * 24 * 60 * 60 * 1000 : 0;

    return items.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (isFavorites && fileTypeFilter !== 'all' && item.type !== '文件') return false;
      if (isFavorites && fileTypeFilter !== 'all' && item.fileType !== fileTypeFilter) return false;
      if (!isFavorites && rangeFilter === 'today' && item.timestamp < startOfToday) return false;
      if (!isFavorites && rangeFilter === 'yesterday' && (item.timestamp < startOfYesterday || item.timestamp >= startOfToday)) return false;
      if (!isFavorites && rangeFilter.endsWith('d') && item.timestamp < since) return false;
      if (keyword) {
        const haystack = `${item.title || ''} ${item.meta || ''} ${item.company || ''} ${item.description || ''} ${item.note || ''}`.toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      return true;
    }).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [items, query, typeFilter, fileTypeFilter, rangeFilter, isFavorites]);

  const groupedHistory = useMemo(() => {
    if (isFavorites) return [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    return filteredItems.reduce((groups, item) => {
      let label = '更早';
      if (item.timestamp >= startOfToday) label = '今天';
      else if (item.timestamp >= startOfYesterday) label = '昨天';
      const group = groups.find((entry) => entry.label === label);
      if (group) group.items.push(item);
      else groups.push({ label, items: [item] });
      return groups;
    }, []);
  }, [filteredItems, isFavorites]);

  const openItem = (item) => {
    if (item.targetPath) navigate(item.targetPath);
  };

  const openEditFavorite = (item) => {
    const parsed = parseNote(item.note);
    setEditModal({ open: true, item, group: parsed.group || '未分组', newGroup: '', note: parsed.note });
  };

  const closeEditFavorite = () => {
    setEditModal({ open: false, item: null, group: '未分组', newGroup: '', note: '' });
  };

  const saveEditFavorite = async () => {
    if (!editModal.item) return;
    const selectedGroup = editModal.group === '__new__' ? editModal.newGroup.trim() : editModal.group;
    const note = formatNote(selectedGroup === '未分组' ? '' : selectedGroup, editModal.note.trim());
    await api.updateFavoriteNote(editModal.item.id, note);
    setItems((current) => current.map((entry) => entry.id === editModal.item.id ? { ...entry, note } : entry));
    closeEditFavorite();
  };

  const deleteFavorite = async (item) => {
    await api.deleteFavorite(item.id);
    setItems((current) => current.filter((entry) => entry.id !== item.id));
  };

  const deleteHistory = async (item) => {
    await api.deleteHistoryItem(item.id);
    setItems((current) => current.filter((entry) => entry.id !== item.id));
  };

  const clearHistory = async () => {
    if (!confirm('确定清空全部浏览历史吗？')) return;
    await api.clearHistory();
    setItems([]);
  };

  const toggleHistory = async () => {
    const next = !historyEnabled;
    await api.updateHistorySetting(next);
    setHistoryEnabled(next);
  };

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <section className={styles.hero}>
          <div>
            <h1>{isFavorites ? '我的收藏' : '浏览历史'}</h1>
            <p>{isFavorites ? '集中保存你关注的公司、产品和文件，方便后续快速查阅与整理。' : '按时间线整理你查看过的公司、产品和文件，方便回到最近关注的资料。'}</p>
          </div>
          <div className={styles.stats}>
            <span><strong>{stats.all}</strong>全部</span>
            <span><strong>{stats.file}</strong>文件</span>
            <span><strong>{stats.product}</strong>产品</span>
          </div>
        </section>

        <div className={styles.tabs}>
          <Link className={isFavorites ? styles.active : ''} to="/favorites">我的收藏</Link>
          <Link className={!isFavorites ? styles.active : ''} to="/history">浏览历史</Link>
        </div>

        <section className={styles.toolbar}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isFavorites ? '搜索资料库：公司、产品、文件、备注' : '搜索资料库：公司、产品、文件'} />
          <div className={styles.quickFilters}>
            {typeOptions.map((item) => <button key={item.value} className={typeFilter === item.value ? styles.active : ''} onClick={() => setTypeFilter(item.value)}>{item.label}</button>)}
          </div>
          {isFavorites ? (
            <select value={fileTypeFilter} onChange={(event) => setFileTypeFilter(event.target.value)}>
              {fileTypeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          ) : (
            <select value={rangeFilter} onChange={(event) => setRangeFilter(event.target.value)}>
              {rangeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          )}
        </section>

        <div className={styles.resultBar}>
          <span>{loading ? '正在加载...' : `${filteredItems.length} 条${isFavorites ? '收藏' : '历史'}`}</span>
          <div className={styles.actions}>
            {!isFavorites && <button className={styles.secondaryBtn} onClick={toggleHistory}>{historyEnabled ? '暂停记录' : '恢复记录'}</button>}
            {!isFavorites && items.length > 0 && <button className={styles.dangerBtn} onClick={clearHistory}>清空历史</button>}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className={styles.empty}>
            <strong>{loading ? '正在加载' : isFavorites ? '暂无收藏' : '暂无浏览历史'}</strong>
            <p>{isFavorites ? '在公司、产品或文件详情页点击收藏后会出现在这里。' : '查看公司、产品或文件后会自动记录在这里。'}</p>
            <Link className={styles.primaryAction} to="/search">去搜索资料</Link>
          </div>
        ) : isFavorites ? (
          <div className={styles.list}>
            {filteredItems.map((item) => {
              const parsed = parseNote(item.note);
              return (
                <article key={item.id} className={styles.card}>
                  <div className={`${styles.typeBadge} ${getToneClass(item.type)}`}>{item.type}</div>
                  <div>
                    <button className={styles.cardTitle} onClick={() => openItem(item)}>{item.title}</button>
                    <div className={styles.meta}>
                      <span>{item.meta || '暂无来源'}</span>
                      {item.type === '文件' && <span>{fileTypeOptions.find((option) => option.value === item.fileType)?.label || '文件'}</span>}
                      {parsed.group && <span>分组：{parsed.group}</span>}
                      <span>{item.status}</span>
                    </div>
                    {parsed.note && <div className={styles.note}>备注：{parsed.note}</div>}
                    {item.statusReason && <div className={styles.note}>状态原因：{item.statusReason}</div>}
                  </div>
                  <div className={styles.actions}>
                    <button className={styles.secondaryBtn} onClick={() => openItem(item)}>查看</button>
                    <button className={styles.secondaryBtn} onClick={() => openEditFavorite(item)}>整理</button>
                    <button className={styles.dangerBtn} onClick={() => deleteFavorite(item)}>取消收藏</button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.timeline}>
            {groupedHistory.map((group) => (
              <section key={group.label} className={styles.dayGroup}>
                <div className={styles.dayLabel}>{group.label}<em>{group.items.length} 条</em></div>
                <div className={styles.dayItems}>
                  {group.items.map((item) => (
                    <article key={item.id} className={`${styles.card} ${styles.historyCard}`}>
                      <div className={`${styles.typeBadge} ${getToneClass(item.type)}`}>{item.type}</div>
                      <div>
                        <button className={styles.cardTitle} onClick={() => openItem(item)}>{item.title}</button>
                        <div className={styles.meta}><span>{item.company || '暂无来源'}</span></div>
                      </div>
                      <div className={styles.timeBlock}>
                        <strong>{new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</strong>
                        <span>{item.action}</span>
                      </div>
                      <div className={styles.actions}>
                        <button className={styles.secondaryBtn} onClick={() => openItem(item)}>继续查看</button>
                        <button className={styles.dangerBtn} onClick={() => deleteHistory(item)}>删除</button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
      {editModal.open && (
        <div className={styles.modalBackdrop} onClick={closeEditFavorite}>
          <div className={styles.editModal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3>整理收藏</h3>
                <p>选择收藏分组，或新建分组；备注用于记录收藏原因和后续用途。</p>
              </div>
              <button className={styles.modalClose} onClick={closeEditFavorite}>×</button>
            </div>
            <div className={styles.editTarget}>
              <span className={`${styles.typeBadge} ${getToneClass(editModal.item?.type)}`}>{editModal.item?.type}</span>
              <div>
                <strong>{editModal.item?.title}</strong>
                <p>{editModal.item?.meta || '暂无来源信息'}</p>
              </div>
            </div>
            <div className={styles.editSection}>
              <span>收藏分组</span>
              <div className={styles.folderGrid}>
                {favoriteGroups.map((group) => (
                  <button key={group.name} className={editModal.group === group.name ? styles.folderActive : ''} onClick={() => setEditModal((form) => ({ ...form, group: group.name, newGroup: '' }))}>
                    <strong>{group.name}</strong>
                    <em>{group.count} 条</em>
                  </button>
                ))}
                <button className={editModal.group === '__new__' ? styles.folderActive : ''} onClick={() => setEditModal((form) => ({ ...form, group: '__new__' }))}>
                  <strong>+ 新建分组</strong>
                  <em>创建新的收藏夹</em>
                </button>
              </div>
            </div>
            {editModal.group === '__new__' && (
              <label className={styles.editField}>
                <span>新分组名称</span>
                <input value={editModal.newGroup} onChange={(event) => setEditModal((form) => ({ ...form, newGroup: event.target.value }))} placeholder="例如：客户项目 / 投标资料 / 待采购" />
              </label>
            )}
            <label className={styles.editField}>
              <span>备注</span>
              <textarea rows="4" value={editModal.note} onChange={(event) => setEditModal((form) => ({ ...form, note: event.target.value }))} placeholder="例如：客户下周要核对；投标文件可能会用到。" />
            </label>
            <div className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={closeEditFavorite}>取消</button>
              <button className={styles.primaryBtn} onClick={saveEditFavorite}>保存整理</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
