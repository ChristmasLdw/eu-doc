// Script to extract data from eu-doc.com and seed the database
// Run with: npx tsx scripts/extract-data.ts

interface Company {
  id: string;
  name: string;
  country: string;
  certificates: Certificate[];
}

interface Certificate {
  id: string;
  name: string;
  category: string;
  certifiedType: string;
  languages: string[];
  imageUrl?: string;
  pdfUrl?: string;
}

// Data extracted from eu-doc.com
export const companies: Company[] = [
  {
    id: "0200020",
    name: "Tipperary Equestrian / Phoenix Performance Products Inc.",
    country: "Ireland",
    certificates: [
      {
        id: "6161",
        name: "F20-201AL, F20-201AE, F20-201AE-MP, F20-202AL",
        category: "Helmet",
        certifiedType: "CE",
        languages: ["EN"],
        imageUrl: "http://www.eu-doc.com/user/20/20_100_52_6161_1.png",
        pdfUrl: "./user/20/attachments/20260505090148_7349.pdf",
      },
      {
        id: "6160",
        name: "F11 Plus-112A, F11 Plus-112A-SV, F11 Plus-118A",
        category: "Helmet",
        certifiedType: "CE",
        languages: ["EN"],
        imageUrl: "http://www.eu-doc.com/user/20/20_100_52_6160_1.png",
        pdfUrl: "./user/20/attachments/20260505090148_7349.pdf",
      },
      {
        id: "6159",
        name: "F35 Plus-357A",
        category: "Helmet",
        certifiedType: "CE",
        languages: ["EN"],
        imageUrl: "http://www.eu-doc.com/user/20/20_100_52_6159_1.png",
        pdfUrl: "./user/20/attachments/20260505090148_7349.pdf",
      },
      {
        id: "6158",
        name: "F60-608A",
        category: "Helmet",
        certifiedType: "CE",
        languages: ["EN"],
        imageUrl: "http://www.eu-doc.com/user/20/20_100_52_6158_1.png",
        pdfUrl: "./user/20/attachments/20260505090148_7349.pdf",
      },
      {
        id: "6156",
        name: "F70-709A",
        category: "Helmet",
        certifiedType: "CE",
        languages: ["EN"],
        imageUrl: "http://www.eu-doc.com/user/20/20_100_52_6156_1.png",
        pdfUrl: "./user/20/attachments/20260505090148_7349.pdf",
      },
      {
        id: "71",
        name: "F70-709 Multi-language",
        category: "Helmet",
        certifiedType: "CE",
        languages: ["EN", "NL", "PT", "ES", "SE", "IT"],
        imageUrl: "http://www.eu-doc.com/user/20/20_100_52_71_1.jpeg",
      },
    ],
  },
  {
    id: "0200035",
    name: "Shaoxing RIF Sports Goods Co., Ltd",
    country: "China",
    certificates: [
      {
        id: "rif-001",
        name: "RIF Sports Helmet",
        category: "Helmet",
        certifiedType: "CE",
        languages: ["EN"],
      },
    ],
  },
  {
    id: "0201028",
    name: "Qilin Sports",
    country: "China",
    certificates: [
      {
        id: "qilin-001",
        name: "Qilin Equestrian Helmet",
        category: "Helmet",
        certifiedType: "CE",
        languages: ["EN"],
      },
    ],
  },
  {
    id: "0201036",
    name: "Kylin Sports",
    country: "China",
    certificates: [
      {
        id: "kylin-001",
        name: "Kylin Equestrian Helmet",
        category: "Helmet",
        certifiedType: "CE",
        languages: ["EN"],
      },
    ],
  },
  {
    id: "0201037",
    name: "Brothers Sports",
    country: "China",
    certificates: [
      {
        id: "brothers-001",
        name: "Brothers Equestrian Helmet",
        category: "Helmet",
        certifiedType: "CE",
        languages: ["EN"],
      },
    ],
  },
  {
    id: "0201038",
    name: "Cavalli Group B.V.",
    country: "Netherlands",
    certificates: [
      {
        id: "608",
        name: "F60-608",
        category: "Helmet",
        certifiedType: "CE",
        languages: ["EN"],
      },
      {
        id: "709",
        name: "F70-709",
        category: "Helmet",
        certifiedType: "CE",
        languages: ["EN"],
      },
    ],
  },
];

// Categories found on eu-doc.com
export const categories = [
  {
    id: "helmet",
    name: "Helmet",
    nameZh: "头盔",
    slug: "helmet",
    description: "Equestrian and sports helmets with CE certification",
    descriptionZh: "马术及运动头盔 CE 认证",
    count: 207, // Total certificates in this category
  },
];

// Function to generate seed data for the database
export function generateSeedData() {
  const seedCompanies = companies.map((c) => ({
    id: c.id,
    name: c.name,
    country: c.country,
  }));

  const seedCertificates = companies.flatMap((company) =>
    company.certificates.map((cert) => ({
      id: cert.id,
      name: cert.name,
      certifiedType: cert.certifiedType,
      categoryId: "helmet",
      companyId: company.id,
      languages: cert.languages,
      imageUrl: cert.imageUrl,
      pdfUrl: cert.pdfUrl,
      status: "ACTIVE" as const,
    }))
  );

  return {
    categories,
    companies: seedCompanies,
    certificates: seedCertificates,
  };
}
