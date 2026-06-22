-- 添加用户说明书和 DoC 声明字段
ALTER TABLE certificates 
ADD COLUMN manual_path VARCHAR(500) DEFAULT NULL;

ALTER TABLE certificates 
ADD COLUMN declaration_path VARCHAR(500) DEFAULT NULL;

-- 更新现有数据作为示例
UPDATE certificates 
SET manual_path = '/uploads/manuals/20260505090148_7349.pdf',
    declaration_path = '/uploads/declarations/20_100_52_6160_doc.pdf'
WHERE cert_no IN ('20_100_52_6160', '20_100_52_6159', '20_100_52_6158', '20_100_52_6157', '20_100_52_6155');
