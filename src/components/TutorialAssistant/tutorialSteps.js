export const tutorialDefinitions = {
  manage: {
    id: 'business-onboarding',
    version: 3,
    title: '企业用户入门',
    steps: [
      {
        id: 'business-overview',
        title: '先了解完整使用流程',
        description: '企业用户需要先注册账号并申请公司，再创建产品、上传资料并确认归档。',
        tip: '本轮引导只覆盖完成首次资料上传所需的核心步骤。',
        targetElement: '#business-overview',
      },
      {
        id: 'business-register',
        title: '注册或登录企业账号',
        description: '点击“登录 / 注册”，使用工作邮箱创建账号；已有账号可以直接登录。',
        tip: '注册成功后会进入企业后台，再继续申请或加入公司。',
        targetElement: '#auth-button',
      },
      {
        id: 'business-company',
        title: '申请自己的公司',
        description: '填写公司名称和联系邮箱，先创建公司申请草稿，后续再补充认证资料。',
        tip: '如果你是被邀请成员，应加入已有公司，不要重复创建。',
        targetElement: '#create-company-button',
      },
      {
        id: 'business-product',
        title: '创建第一个产品',
        description: '填写产品或系列名称、适用型号等基础信息，为后续资料建立归属。',
        tip: '一个系列包含多个型号时，系列名称和适用型号应分开填写。',
        targetElement: '#create-product-button',
      },
      {
        id: 'business-upload',
        title: '上传产品文件',
        description: '选择单份或多份 DoC、证书、说明书、检测报告等产品资料进行上传。',
        tip: '上传后的文件先进入待整理区，不会立刻公开。',
        targetElement: '#upload-section',
      },
      {
        id: 'business-organize',
        title: '确认文件归属并归档',
        description: '核对资料类型、所属产品、适用型号和语言版本，再确认归档。',
        tip: '完成归档后，文件才会正式进入对应产品的资料列表。',
        targetElement: '#batch-confirm',
      },
      {
        id: 'business-check',
        title: '检查产品资料',
        description: '返回产品资料页检查已归档文件，并继续补充缺失资料。',
        tip: '企业认证和审核状态属于后续阶段，本轮先确保你能完成首次上传。',
        targetElement: '#product-documents',
      },
    ],
  },
};

export const manageTutorialSteps = tutorialDefinitions.manage.steps;

export function getTutorialDefinition(path) {
  return tutorialDefinitions[path] || null;
}
