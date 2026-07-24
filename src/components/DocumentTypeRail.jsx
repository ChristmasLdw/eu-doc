/**
 * 资料类型选择器
 * 仅在资料模式下显示的二级筛选
 */

import { useTranslation } from 'react-i18next';
import styles from './DocumentTypeRail.module.css';

const DOCUMENT_TYPES = [
  { value: 'all' },
  { value: 'declaration_of_conformity' },
  { value: 'certificate' },
  { value: 'manual' },
  { value: 'test_report' },
];

export default function DocumentTypeRail({ currentType, onTypeChange, show }) {
  const { t } = useTranslation();

  // 始终渲染容器，使用 CSS 控制显示/隐藏，避免布局跳动
  return (
    <div className={`${styles.container} ${show ? styles.show : ''}`}>
      <div className={styles.types}>
        {DOCUMENT_TYPES.map((type) => {
          const isActive = currentType === type.value;
          const label = t(`search.documentTypes.${type.value}`);

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

