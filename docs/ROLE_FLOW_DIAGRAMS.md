# Xedu — Rollar bo‘yicha ish oqimi (Mermaid Diagrammalar)

Ushbu hujjatda loyihaning asosiy foydalanuvchi rollari, ularning huquqlari va ma’lumotlar oqimi Mermaid diagrammalari orqali tasvirlangan.

---

## 1. Super Admin → Maktab → Direktor (Asosiy Flow)

Bu diagramma Super Admin tomonidan maktab yaratish, unga direktor tayinlash va tizimga kirish jarayonini ko‘rsatadi.

```mermaid
sequenceDiagram
    actor SA as Super Admin
    participant FE as Frontend
    participant API as Backend API
    participant DB as PostgreSQL

    SA->>FE: Maktab qo'shish (schools page)
    FE->>API: POST /schools
    API-->>DB: INSERT School
    DB-->>API: School ma'lumotlari
    API-->>FE: 201 Created
    FE-->>SA: Maktab ro'yxatda ko'rinadi

    SA->>FE: Maktab detaliga kirish -> "Direktor qo'shish"
    FE->>API: POST /users (role=director, schoolId=id)
    API-->>DB: INSERT User (role=director)
    DB-->>API: Direktor ma'lumotlari
    API-->>FE: 201 Created
    FE->>FE: Invalidate ['school', id] + ['school-users', id]
    FE-->>SA: Direktor sahifada avtomatik ko'rinadi

    Note over SA,DB: Keyingi bosqichda Direktor tizimga kiradi

    actor D as Direktor
    D->>FE: Login (email + parol)
    FE->>API: POST /auth/login
    API-->>DB: SELECT User (role=director)
    DB-->>API: Foydalanuvchi + schoolId
    API-->>FE: JWT (access_token cookie)
    FE-->>D: Dashboard (school-wide view, branchId = null)
```

---

## 2. Direktor ish oqimi (Dashboard dan boshlab)

```mermaid
flowchart TD
    subgraph DirektorPanel["Direktor Dashboard"]
        D[Direktor Kirish]
        D --> DASH["📊 Umumiy ko‘rinish<br/>(KPI, Statistika)"]
        D --> BR["🏢 Filiallar<br/>(CRUD — yaratish, tahrirlash, o‘chirish)"]
        D --> USR["👥 Jamoa<br/>(Xodimlar, Foydalanuvchilar)"]
        D --> EDU["📚 Ta'lim<br/>(Sinflar, Fanlar, Dars jadvali, Akademik kalendar)"]
        D --> FIN["💰 Moliya<br/>(To‘lovlar, Tariflar, Ish haqi)"]
        D --> REP["📈 Hisobotlar<br/>(Davomat, Baholar, Moliyaviy)"]
        D --> DIS["⚠️ Intizom<br/>(Jazo, Ogohlantirishlar)"]
        D --> SET["⚙️ Sozlamalar"]
    end

    BR --> BA["Filial Admin tayinlash"]
    USR --> VP["Zam Direktor (Vice Principal)"]
    USR --> ACC["Hisobchi (Accountant)"]
    USR --> TCH["O‘qituvchi (Teacher)"]
    USR --> LIB["Kutubxonachi (Librarian)"]
    EDU --> CLS["Sinf rahbari (Class Teacher)"]
    EDU --> STD["O‘quvchi qo‘shish"]
    FIN --> PAY["Ota-onalar to‘lovlari"]
    REP --> ATT["Davomat hisobotlari"]
    REP --> GRD["Baholar hisobotlari"]

    style D fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style DASH fill:#e3f2fd
    style BR fill:#fff3e0
    style USR fill:#fce4ec
    style EDU fill:#f3e5f5
    style FIN fill:#e0f2f1
    style REP fill:#e8eaf6
```

---

## 3. Barcha rollar ierarhiyasi va huquqlari

```mermaid
flowchart TB
    subgraph AuthLayer["Autentifikatsiya va Tekshiruv"]
        Login[/🔐 Login sahifasi/]
        JWT["JWT Token (cookie)"]
        MW["Next.js Middleware<br/>(branchId tekshiruvi)"]
        RG["RoleGuard<br/>(ROUTE_PERMISSIONS)"]
    end

    Login --> JWT --> MW --> RG

    subgraph RoleHierarchy["Rollar (Ierarxiya bo‘yicha)"]
        SA["👑 SUPER_ADMIN<br/>Rank 100"]
        DIR["🎓 DIRECTOR<br/>Rank 80"]
        VP["📋 VICE_PRINCIPAL<br/>Rank 60"]
        BA["🏫 BRANCH_ADMIN<br/>Rank 40"]
        ACC["🧮 ACCOUNTANT<br/>Rank 20"]
        LIB["📚 LIBRARIAN<br/>Rank 20"]
        CT["👨‍🏫 CLASS_TEACHER<br/>Rank 15"]
        TCH["👩‍🏫 TEACHER<br/>Rank 10"]
        PAR["👨‍👩‍👧 PARENT<br/>Rank 5"]
        STD["🎒 STUDENT<br/>Rank 5"]
    end

    RG --> SA & DIR & VP & BA & ACC & LIB & CT & TCH & PAR & STD

    subgraph Pages["Sahifalar va Modullar"]
        P1["Platform boshqaruvi<br/>(Maktablar, Tizim holati, Audit)"]
        P2["Maktab boshqaruvi<br/>(Dashboard, Filiallar, Jamoa, Sozlamalar)"]
        P3["Ta'lim va Intizom<br/>(Sinflar, Fanlar, Davomat, Baholar)"]
        P4["Filial operatsiyalari<br/>(Xodimlar, Dars jadvali, Ta'til)"]
        P5["Moliya<br/>(To‘lovlar, Ish haqi, Tariflar, Hisobotlar)"]
        P6["Kutubxona<br/>(Resurslar, Kitoblar)"]
        P7["Akademik<br/>(Dars jadvali, Uy vazifasi, Imtihon)"]
        P8["Sinf rahbari<br/>(Mening sinfim, Omma davomati)"]
        P9["Ota-ona portali<br/>(Farzand, To‘lovlar, Aloqa)"]
        P10["O‘quvchi portali<br/>(Darslar, Baholar, Do‘kon, Coin)"]
    end

    SA --> P1
    SA -.->|KIRISH YO‘Q| P2

    DIR --> P2 & P3 & P5 & P6 & P7 & P8 & P9 & P10
    VP --> P3 & P4 & P7 & P8
    BA --> P4 & P5 & P7
    ACC --> P5
    LIB --> P6
    TCH --> P7
    CT --> P7 & P8
    PAR --> P9
    STD --> P10

    style SA fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style DIR fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style VP fill:#e8f5e9,stroke:#2e7d32
    style BA fill:#fff3e0,stroke:#ef6c00
    style ACC fill:#fce4ec,stroke:#c2185b
    style TCH fill:#f3e5f5,stroke:#7b1fa2
    style CT fill:#f3e5f5,stroke:#7b1fa2
    style STD fill:#e0f2f1,stroke:#00695c
    style PAR fill:#e0f2f1,stroke:#00695c
```

---

## 4. Ma’lumotlar modeli (School ↔ Branch ↔ User)

```mermaid
erDiagram
    SCHOOL ||--o{ BRANCH : "has many"
    SCHOOL ||--o{ USER : "has many"
    BRANCH ||--o{ USER : "has many"
    BRANCH ||--o{ CLASS : "has many"
    USER ||--o{ USER_BRANCH_ASSIGNMENT : "optional many"
    USER_BRANCH_ASSIGNMENT }o--|| BRANCH : "belongs to"

    SCHOOL {
        string id PK
        string name
        string address
        string phone
        string email
        datetime createdAt
        datetime updatedAt
    }

    BRANCH {
        string id PK
        string name
        string schoolId FK
        string address
        datetime createdAt
    }

    USER {
        string id PK
        string firstName
        string lastName
        string email
        string phone
        UserRole role
        string password
        string schoolId FK "nullable (super_admin)"
        string branchId FK "nullable (director)"
        datetime createdAt
    }

    USER_BRANCH_ASSIGNMENT {
        string userId PK,FK
        string branchId PK,FK
        UserRole branchRole
        datetime assignedAt
    }

    CLASS {
        string id PK
        string name
        string schoolId FK
        string branchId FK
        string teacherId FK
    }
```

---

## 5. Backend avtorizatsiya oqimi (API so‘rovi)

```mermaid
flowchart LR
    REQ["🌐 HTTP Request<br/>(POST /users)"] --> JWT["🔑 JwtAuthGuard<br/>(token tekshiruvi)"]
    JWT --> ROLES["🛡️ RolesGuard<br/>(@Roles(...) tekshiruvi)"]
    ROLES --> HIER["📊 RoleHierarchy<br/>(canManageUser)"]
    HIER --> CTRL["⚙️ Controller<br/>(Service chaqiruvi)"]
    CTRL --> DB["🗄️ Database<br/>(Prisma)"]

    style REQ fill:#e3f2fd
    style JWT fill:#fff3e0
    style ROLES fill:#e8f5e9
    style HIER fill:#fce4ec
    style DB fill:#e0f2f1
```

---

## 6. Filial almashish (Branch Switch) logikasi

```mermaid
flowchart TD
    D[Direktor / Super Admin] -->|Barcha filiallar| ALL["🔀 Istagan filialni tanlash<br/>(branchId = null ham mumkin)"]
    BA[Branch Admin] -->|Faqat o'z filiali| ONE["🔒 Belgilangan filial<br/>(User.branchId)"]
    TCH[Teacher] -->|Ko'p filiallar| MUL["📋 UserBranchAssignment<br/>(assignedBranchIds)"]

    ALL --> DASH_S["School-wide Dashboard"]
    ONE --> DASH_B["Branch Dashboard"]
    MUL --> DASH_B

    style D fill:#e8f5e9
    style ALL fill:#e3f2fd
    style ONE fill:#fff3e0
    style MUL fill:#f3e5f5
```

---

## 7. Key Files (Muhim fayllar)

| Maqsad | Yo‘l |
|---|---|
| **Shared Role Enum** | `packages/types/src/enums.ts` |
| **Frontend Permissions SSOT** | `apps/frontend/src/config/permissions.ts` |
| **Frontend Navigation/Sidebar** | `apps/frontend/src/config/navigation.ts` |
| **Frontend Middleware** | `apps/frontend/src/middleware.ts` |
| **Frontend Role Guard** | `apps/frontend/src/components/auth/role-guard.tsx` |
| **Backend Roles Decorator** | `apps/backend/src/common/decorators/roles.decorator.ts` |
| **Backend Roles Guard** | `apps/backend/src/common/guards/roles.guard.ts` |
| **Backend Role Hierarchy** | `apps/backend/src/common/utils/role-hierarchy.util.ts` |
| **Prisma Schema** | `apps/backend/prisma/schema.prisma` |
| **Auth Service** | `apps/backend/src/modules/auth/auth.service.ts` |
