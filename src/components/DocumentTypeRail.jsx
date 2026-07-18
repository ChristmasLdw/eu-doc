/**
 * 资料类型选择器
 * 仅在资料模式下显示的二级筛选
 */

import { useTranslation } from 'react-i18next';
import styles from './DocumentTypeRail.module.css';

const DOCUMENT_TYPES = [
  { value: 'all', label: '全部资料', labelEn: 'All Documents' },
  { value: 'doc', label: 'DoC', labelEn: 'DoC' },
  { value: 'certificate', label: '证书', labelEn: 'Certificates' },
  { value: 'manual', label: '说明书', labelEn: 'Manuals' },
  { value: 'report', label: '检测报告', labelEn: 'Test Reports' },
];

export default function DocumentTypeRail({ currentType, onTypeChange, show }) {
  const { i18n } = useTranslation();

  // 始终渲染容器，使用 CSS 控制显示/隐藏，避免布局跳动
  return (
    <div className={`${styles.container} ${show ? styles.show : ''}`}>
      <div className={styles.types}>
        {DOCUMENT_TYPES.map((type) => {
          const isActive = currentType === type.value;
          const label = i18n.language === 'en' ? type.labelEn : type.label;

          return (
            <button
              key={type.value}
              type="button"
              className={`${styles.typeBtn} ${isActive ? styles.active : ''}`}
              onClick={() => onTypeChange(type.value)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

