import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../contexts/AdminContext';
import * as api from '../services/api';
import styles from './PersonalLibraryPage.module.css';

const typeOptions = [
  { value: 'all', labelKey: 'personalLibrary.typeAll' },
  { value: '公司', labelKey: 'personalLibrary.typeCompany' },
  { value: '产品', labelKey: 'personalLibrary.typeProduct' },
  { value: '文件', labelKey: 'personalLibrary.typeFile' },
];

const fileTypeOptions = [
  { value: 'all', labelKey: 'personalLibrary.allFiles' },
  { value: 'certificate', labelKey: 'personalLibrary.certificate' },
  { value: 'doc', labelKey: 'personalLibrary.doc' },
  { value: 'manual', labelKey: 'personalLibrary.manual' },
  { value: 'report', labelKey: 'personalLibrary.report' },
];

const rangeOptions = [
  { value: 'all', labelKey: 'personalLibrary.allTime' },
  { value: 'today', labelKey: 'personalLibrary.today' },
  { value: 'yesterday', labelKey: 'personalLibrary.yesterday' },
  { value: '7d', labelKey: 'personalLibrary.last7Days' },
  { value: '30d', labelKey: 'personalLibrary.last30Days' },
  { value: '90d', labelKey: 'personalLibrary.last90Days' },
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
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [historyEnabled, setHistoryEnabled] = useState(true);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [rangeFilter, setRangeFilter] = useState('all');
  const [editModal, setEditModal] = useState({ open: false, item: null, group: '未分组', newGroup: '', note: '' });

  const isFavorites = mode === 'favorites';
  const displayType = (type) => {
    if (type === '公司') return t('personalLibrary.typeCompany');
    if (type === '产品') return t('personalLibrary.typeProduct');
    if (type === '文件') return t('personalLibrary.typeFile');
    return type;
  };
  const displayFileType = (fileType) => t(fileTypeOptions.find((option) => option.value === fileType)?.labelKey || 'personalLibrary.typeFile');
  const displayStatus = (status) => status === '正常' ? t('personalLibrary.normal') : status;
  const displayGroup = (group) => group === '未分组' ? t('personalLibrary.ungrouped') : group;

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
            action: item.actionLabel || t('personalLibrary.view'),
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
      let label = 'earlier';
      if (item.timestamp >= startOfToday) label = 'today';
      else if (item.timestamp >= startOfYesterday) label = 'yesterday';
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
    if (!confirm(t('personalLibrary.clearHistoryConfirm'))) return;
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
            <h1>{isFavorites ? t('personalLibrary.favoritesTitle') : t('personalLibrary.historyTitle')}</h1>
            <p>{isFavorites ? t('personalLibrary.favoritesSubtitle') : t('personalLibrary.historySubtitle')}</p>
          </div>
          <div className={styles.stats}>
            <span><strong>{stats.all}</strong>{t('personalLibrary.all')}</span>
            <span><strong>{stats.file}</strong>{t('personalLibrary.files')}</span>
            <span><strong>{stats.product}</strong>{t('personalLibrary.products')}</span>
          </div>
        </section>

        <div className={styles.tabs}>
          <Link className={isFavorites ? styles.active : ''} to="/favorites">{t('personalLibrary.favoritesTitle')}</Link>
          <Link className={!isFavorites ? styles.active : ''} to="/history">{t('personalLibrary.historyTitle')}</Link>
        </div>

        <section className={styles.toolbar}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isFavorites ? t('personalLibrary.favoritesSearchPlaceholder') : t('personalLibrary.historySearchPlaceholder')} />
          <div className={styles.quickFilters}>
            {typeOptions.map((item) => <button key={item.value} className={typeFilter === item.value ? styles.active : ''} onClick={() => setTypeFilter(item.value)}>{t(item.labelKey)}</button>)}
          </div>
          {isFavorites ? (
            <select value={fileTypeFilter} onChange={(event) => setFileTypeFilter(event.target.value)}>
              {fileTypeOptions.map((item) => <option key={item.value} value={item.value}>{t(item.labelKey)}</option>)}
            </select>
          ) : (
            <select value={rangeFilter} onChange={(event) => setRangeFilter(event.target.value)}>
              {rangeOptions.map((item) => <option key={item.value} value={item.value}>{t(item.labelKey)}</option>)}
            </select>
          )}
        </section>

        <div className={styles.resultBar}>
          <span>{loading ? t('personalLibrary.loading') : t(isFavorites ? 'personalLibrary.favoriteCount' : 'personalLibrary.historyCount', { count: filteredItems.length })}</span>
          <div className={styles.actions}>
            {!isFavorites && <button className={styles.secondaryBtn} onClick={toggleHistory}>{historyEnabled ? t('personalLibrary.pauseHistory') : t('personalLibrary.resumeHistory')}</button>}
            {!isFavorites && items.length > 0 && <button className={styles.dangerBtn} onClick={clearHistory}>{t('personalLibrary.clearHistory')}</button>}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className={styles.empty}>
            <strong>{loading ? t('personalLibrary.loadingShort') : isFavorites ? t('personalLibrary.emptyFavorites') : t('personalLibrary.emptyHistory')}</strong>
            <p>{isFavorites ? t('personalLibrary.emptyFavoritesDesc') : t('personalLibrary.emptyHistoryDesc')}</p>
            <Link className={styles.primaryAction} to="/search">{t('personalLibrary.goSearch')}</Link>
          </div>
        ) : isFavorites ? (
          <div className={styles.list}>
            {filteredItems.map((item) => {
              const parsed = parseNote(item.note);
              return (
                <article key={item.id} className={styles.card}>
                  <div className={`${styles.typeBadge} ${getToneClass(item.type)}`}>{displayType(item.type)}</div>
                  <div>
                    <button className={styles.cardTitle} onClick={() => openItem(item)}>{item.title}</button>
                    <div className={styles.meta}>
                      <span>{item.meta || t('personalLibrary.noSource')}</span>
                      {item.type === '文件' && <span>{displayFileType(item.fileType)}</span>}
                      {parsed.group && <span>{t('personalLibrary.groupPrefix', { group: parsed.group })}</span>}
                      <span>{displayStatus(item.status)}</span>
                    </div>
                    {parsed.note && <div className={styles.note}>{t('personalLibrary.notePrefix', { note: parsed.note })}</div>}
                    {item.statusReason && <div className={styles.note}>{t('personalLibrary.statusReasonPrefix', { reason: item.statusReason })}</div>}
                  </div>
                  <div className={styles.actions}>
                    <button className={styles.secondaryBtn} onClick={() => openItem(item)}>{t('personalLibrary.view')}</button>
                    <button className={styles.secondaryBtn} onClick={() => openEditFavorite(item)}>{t('personalLibrary.organize')}</button>
                    <button className={styles.dangerBtn} onClick={() => deleteFavorite(item)}>{t('personalLibrary.cancelFavorite')}</button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.timeline}>
            {groupedHistory.map((group) => (
              <section key={group.label} className={styles.dayGroup}>
                <div className={styles.dayLabel}>{t(`personalLibrary.${group.label}`)}<em>{t('personalLibrary.itemCount', { count: group.items.length })}</em></div>
                <div className={styles.dayItems}>
                  {group.items.map((item) => (
                    <article key={item.id} className={`${styles.card} ${styles.historyCard}`}>
                      <div className={`${styles.typeBadge} ${getToneClass(item.type)}`}>{displayType(item.type)}</div>
                      <div>
                        <button className={styles.cardTitle} onClick={() => openItem(item)}>{item.title}</button>
                        <div className={styles.meta}><span>{item.company || t('personalLibrary.noSource')}</span></div>
                      </div>
                      <div className={styles.timeBlock}>
                        <strong>{new Date(item.timestamp).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}</strong>
                        <span>{item.action}</span>
                      </div>
                      <div className={styles.actions}>
                        <button className={styles.secondaryBtn} onClick={() => openItem(item)}>{t('personalLibrary.continueView')}</button>
                        <button className={styles.dangerBtn} onClick={() => deleteHistory(item)}>{t('personalLibrary.delete')}</button>
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
                <h3>{t('personalLibrary.organizeFavorite')}</h3>
                <p>{t('personalLibrary.organizeDesc')}</p>
              </div>
              <button className={styles.modalClose} onClick={closeEditFavorite}>×</button>
            </div>
            <div className={styles.editTarget}>
              <span className={`${styles.typeBadge} ${getToneClass(editModal.item?.type)}`}>{displayType(editModal.item?.type)}</span>
              <div>
                <strong>{editModal.item?.title}</strong>
                <p>{editModal.item?.meta || t('personalLibrary.noSourceInfo')}</p>
              </div>
            </div>
            <div className={styles.editSection}>
              <span>{t('personalLibrary.favoriteGroup')}</span>
              <div className={styles.folderGrid}>
                {favoriteGroups.map((group) => (
                  <button key={group.name} className={editModal.group === group.name ? styles.folderActive : ''} onClick={() => setEditModal((form) => ({ ...form, group: group.name, newGroup: '' }))}>
                    <strong>{displayGroup(group.name)}</strong>
                    <em>{t('personalLibrary.itemCount', { count: group.count })}</em>
                  </button>
                ))}
                <button className={editModal.group === '__new__' ? styles.folderActive : ''} onClick={() => setEditModal((form) => ({ ...form, group: '__new__' }))}>
                  <strong>+ {t('personalLibrary.newGroup')}</strong>
                  <em>{t('personalLibrary.newGroupDesc')}</em>
                </button>
              </div>
            </div>
            {editModal.group === '__new__' && (
              <label className={styles.editField}>
                <span>{t('personalLibrary.newGroupName')}</span>
                <input value={editModal.newGroup} onChange={(event) => setEditModal((form) => ({ ...form, newGroup: event.target.value }))} placeholder={t('personalLibrary.newGroupPlaceholder')} />
              </label>
            )}
            <label className={styles.editField}>
              <span>{t('personalLibrary.note')}</span>
              <textarea rows="4" value={editModal.note} onChange={(event) => setEditModal((form) => ({ ...form, note: event.target.value }))} placeholder={t('personalLibrary.notePlaceholder')} />
            </label>
            <div className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={closeEditFavorite}>{t('common.cancel')}</button>
              <button className={styles.primaryBtn} onClick={saveEditFavorite}>{t('personalLibrary.saveOrganize')}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
