# Entity Relationship (ER) Diagram & Data Dictionary

**Project:** PrimeWave Reserve — Resource Reservation Management System  
**Organization:** PrimeWave Lab (Pvt) Ltd  
**Author:** Chanuka Vithanage  
**Database:** PostgreSQL 18 with Prisma ORM  

---

## 1. Visual Entity Relationship Diagram

GitHub renders the following Mermaid ER diagram natively:

```mermaid
erDiagram
    User ||--o{ Reservation : "places (1:N)"
    User ||--o{ Notification : "receives (1:N)"
    User {
        String id PK "cuid()"
        String email UK "unique email"
        String name "display name"
        String passwordHash "salted PBKDF2 hash"
        Role role "USER | ADMIN"
        DateTime createdAt "default now()"
        DateTime updatedAt "auto updated"
    }

    ResourceCategory ||--o{ Resource : "categorizes (1:N)"
    ResourceCategory {
        String id PK "cuid()"
        String name UK "unique category name"
        String description "category details"
        DateTime createdAt "default now()"
    }

    Resource ||--o{ Reservation : "allocated to (1:N)"
    Resource {
        String id PK "cuid()"
        String name "facility or equipment name (unique per category)"
        String description "amenities or specs"
        String location "room or cabinet location"
        Int capacity "seat count or unit quantity"
        String imageUrl "optional asset photo"
        ResourceStatus status "AVAILABLE | MAINTENANCE | DECOMMISSIONED"
        Boolean requiresApproval "workflow flag"
        String categoryId FK "references ResourceCategory.id (ON DELETE RESTRICT)"
        DateTime createdAt "default now()"
        DateTime updatedAt "auto updated"
    }

    Reservation ||--o{ Notification : "references (1:N)"
    Reservation {
        String id PK "cuid()"
        String title "purpose or meeting subject"
        String description "optional notes / attendees"
        DateTime startTime "TIMESTAMPTZ(3) Asia/Colombo"
        DateTime endTime "TIMESTAMPTZ(3) Asia/Colombo"
        ReservationStatus status "PENDING | APPROVED | REJECTED | CANCELLED | COMPLETED"
        String rejectionReason "admin explanation if rejected"
        String userId FK "references User.id (ON DELETE CASCADE)"
        String resourceId FK "references Resource.id (ON DELETE CASCADE)"
        DateTime createdAt "TIMESTAMPTZ(3) default now()"
        DateTime updatedAt "TIMESTAMPTZ(3) auto updated"
    }

    Notification {
        String id PK "cuid()"
        String userId FK "references User.id (ON DELETE CASCADE)"
        String title "subject header"
        String message "notification body"
        NotificationType type "APPROVAL | REJECTION | BOOKING_CREATED | SYSTEM"
        Boolean isRead "default false"
        String reservationId FK "references Reservation.id (ON DELETE SET NULL)"
        DateTime createdAt "TIMESTAMPTZ(3) default now()"
    }
```

> **Shareable Links for Official Assessment Submission Form:**  
> - 🌐 **Interactive diagrams.net / draw.io Viewer (Chen Notation):** [https://viewer.diagrams.net/?tags=%7B%7D&lightbox=1&highlight=0000ff&edit=_blank&layers=1&nav=1&dark=auto#R%3Cmxfile%3E%3Cdiagram%20name%3D%22ER%20Diagram%22%20id%3D%22TnAq67ptJJxjntiAUE-H%22%3E7Z1dc5s4FIZ%2FTWZ2L5LRN3CZpF%2BzM%2B3sptvZa2oUmy22XIGTeH%2F9ChucgG2FuEKWbDLTBgsQhFePkF7OwRf4dvr0UcbzyWeR8OwCgeTpAr%2B7QAjhgKhfZclyXQIJC9clY5kmVdlzwdf0P14Vgqp0kSY8b2xYCJEV6bxZOBKzGR8VjbJYSvHY3OxeZM2jzuMx3yr4Ooqz7dJ%2F0qSYrEtDCp7LP%2FF0PKmPDEG1ZhrXG1cF%2BSROxOOLIvz%2BAt9KIYr10vTplmfl1auvy3q%2FD3vWbk5M8lnRZQfKfgJO38Wzm3SZ4yD5Y%2FnX%2FSWO0HY9VdV5sayvQsGf1LqbSTHNVAFUi3GWjmdqeaT24lIVPHBZpOq6XVcrpmmSlLvf3ItZUemqzrD6XFVd1rQ%2B2EOcLaqD3fFcLOSIq1K1yOVDXKRipj59XeYFn6qFS%2FXv%2FZ36710aj2VcFv12O%2BHlNjNRrDb%2FvapWnRV%2FevFnVdfmIxdTXsil2mTyQj5SafX4LHVUC1rVErDoCgAYwpBEkMGwun5V%2B0YBUGsRpICotkAQq1pi1QrHm8M%2BC6UWKq3epBvuopsUi1nCy4rKK%2F84SQv%2BdR6PyrWPCtimpPdplt2KTMjVvvjD6keV54UUP%2FiLNWD105QW0s2WNSdoS%2By20t%2BUugfpRLd1gqSpEwpgQycYNIQKILnCgQ2hSBehVE2qR%2BM2RHopyW7RtnRSf%2BFBNJEdNDVEUr2lViQCLIlE1zXzZOtusK3aunPqIPlLfWfJdXk3Up9mYsabmu7X7jWgttWtbpGxHPNCe454S%2BXdgkqeqQ71oXlZKvkuwRWlDcUuIdmvUVX5nyJVl%2FR5E3F%2Fn6uTbYu4OYdf0ZU5Bt9be0g%2BjdOsL%2FhgCz7SkJJRW%2FAFRuFjA3yOwBd6Dt8snvK%2B2Auhjj0aIEvDyMgoe%2BHAnhPsEQD2y%2BgFe%2FM4zx%2BFTD7F%2BcQUg7DWqJ4iMO0UgRJiBUICoEEIN9IPEB4dwk7eisMQSpH1dQPEkXbmR1FoiT1slD00sOcIe67ZLm9lbyR5XPDkujAGIGooqLhqAthQkwFmZfJHgEnnZaP6wN%2FR%2BfPdeVnMk375C4COv8CO%2BUKASfNlo%2FrA39H562S%2BOP58qPH47wAKOzwmgrD1nAg1VLX1mIiAyLH%2B0qXHRBEFV6s%2BstIIN%2FtKS0Y1qWMSDPWVkfN95aYXOe2%2BEmpk9GKsUqRFbxP1KNKxZ8uoJhCZZA%2FukHdg7yjsdYjcZi9hOcjmc4PHqPs8qnrYfQmSiLUMhjZiTkidcsxxCAeGHSEQeo5g7lSsvg7Nfi0tjlXhxBrAQSBpQEoMwogHQB0BMDAcwBVuzGKX3uOHjHNHJ0wbAm%2F0Ch%2BwYCfI%2Fi55r0ccP8rFnlf9CGt%2B0IJszP6REbdFzi4L47Qp5PRC%2Fok%2F5ePyvnfHY9zg7NA3JoFYqblkFoahCKjTswuqQcOj8Kh705M3xETCirtYwho60Zo1IZBgw3jCoC%2B2zB9h0xAorVhrMVMIKM2DBpsGFcA7GTDuB8zUWVPH8Bgl7xa0AqYaChqLV4CuZZc5FK8hOoZmx1ls59klp4XIZPJRRvFXe4n6x7ktPtJ7HtyUa%2BJfYEOPQDtdI%2FYaEoRdj%2Bl6FzQQ56jZyNcIkIaBK1l9WGjmUW18AOCR0fQ98yiTIwOD6l%2B%2FQ6IgG7wSUNLiX3YaGJRLfqA39Hx8z2xaBSrk0mLZV%2F4le9U2o8fsBSvi43mFWH384rOBT%2FXfJe34pdO4zH%2FJvt6qZKaAOrwo5asF2zUesGD9eIIfsR366XXUCWE9PBZipAgRs0XMpgvrsDnu%2Fki%2Bc9FKnl%2BPZ9LocpNYQjrsg2Hkc4EtZWvSYw6MLX6A4dH59B3B6bvSCV1qmw%2FfwG2NAglRi0YMlgwrvDnuwXTd6CSApDuj5EIW%2FwFvfFn1IMhgwfjCn8n8m6XVZO7VSSOhTzMDt0Vr0TbjyMYbIgJIeuPONcyiQ6ISrpALCuqXRvnzX4uRL3iMl8d5FptAIP506qeer1aGpe%2Fy%2FCmdVXqYq5rW68w1uu2Qi%2B0z30hDCx1u9RoolLdpFzudslZhIdS3xOVegx7KvnaP%2BKBwBp7yCR7dIe8A3tHYc%2F35CQLcU%2FlNER7%2F2OWGDSan0Q9yE86EwZ9z0%2Fq3XYDYagBEDFLuRHUaH4S9SA%2F6UwAPIX8pC%2BiSO%2FTX4hA7JCjFCDdO10tguhasIxLSUoUNkcrLZEwtTVlMBoqQz0IlaFn4ZIy30Nl%2BnyrK219%2FUoLPgItwVd7s2bgYx6EypwJfMhz%2BKY8z8uvBu8HP%2FYKfsgWfkYjZGrRB%2FyOjp%2FvETLFct4XeyEEunEngcQSe0ajY2rFB%2FaOzp7v0TFpfsfjvmZ9EdDShyNb9BmNjWEexMacCX2uWS6umdQQQO3YEzNbY0%2BjvgsbfBdHCAw6%2BS5yIqbfF7mLBM4zdS6HpShFO7xp1vKmoc6bZpElazroFMzisEpxtnqPAU9K9ERfaimF3JCrk5%2FisFyjdZinqqE3sspIT03UdWTpvhZ0ClVxWCrJR1zdfPrTqSVT66u%2FoRrEWIKqk0visFJjPuNSgdWbVBAy%2FZNUa1KZNEs2XwH764PFtoJZ%2FJ1nN%2FHox3j1GL7epaqyk76vjyPrEdaLlrBHbr8HkkbDWMD2BCGfxPNyMUtnP5QWnjeBL6fYBIy6NPU931fst28AJ4m90W9ZOjHsd8RTnWITMGoNEWPW0HE0R2eBfWg0a2pHV%2B8z9ttN4BSxD00GA3k%2FyMfngT0yiT09Ley3m8BJYm80CGnHgM8rzcl5YG82R%2By0sN9uAl5hrz5KUb4J4HlzGc8nn0XCyy3%2BBw%3D%3D%3C%2Fdiagram%3E%3C%2Fmxfile%3E)  
> - 📊 **Interactive Mermaid Live Editor (Crow's Foot Notation):** [https://mermaid.live/edit#pako:vZZRb6NGEMe_ymifclLuTm3f_EYwd6WxsWXwSa2Qqgk7treFXbI7JHXjfPdqweZwQnqtK9UPeFn-swz_-e3AkyiMJDERZKcKtxarXAMArB1ZOBzevzdPsCJH9gFZGQ0TyEVdYkEOrr6bJO9y8VqfGFYbVXwNsFSQehgNeerG_peyVXoLSsLyFnJRNEpe9eKBgCpUJay9ptHqvqFuZkSpsSLIhVSuLnHfno6oanTu0Vj5I7od5MJhySRheXM7_fQ97NDthjErUxJYf8jFOo1WcIBgOo-ToWaKTJmqCApLyCQD9knQBpuSQZvH86fq1U0tezU2bE4TJ_FzrrvBipxpbEEhMm2N3Q_q1M63nhfdRfXnS9tfRV9QgtbYYQWK02JveCzJFVbVLRF9bnuQxKhKd5l5r_x4i1csS-NvKYHNuBcXe5CLDRaqVLwHY4HuG1VXpPmf2YAVacWKnI91NRVuJKRNvdNbYyovLfBOaeL-0jAq1gwF1lj4lHLhCBkK02j2gY1WDPcNala8H7mXqnBLa1tCLkybJJaAzhFDvTNszvbB0bmUkRsHrvvLRfAliGfBzSyCA8yDOMmiJEhCfzaNwsV8HqdpvEii6XCtG2NKQg3W-2fJBXVtzQP6NB6N_X1TmkfYlLgdyfhEUizh023baTZkSfv29JLzD0r-z5u0h_Dtvthn-xLLPvYCMllx25_qxtbGka98RcT-kmvufqOCv4lmX35tmBx8BGQmLYnG96pjtNyOcpHF8yjNgvky--Xqh3cQOIUfQ1Oa6s6MxpKW_y5y4M5L-pZRMo2Tz74pL5erxZdoCgdYRT9FYdYOQ8_ibNaNF_PlLMrOUTyaYcm7pIxeEbpur8pKaaA_6hJ1Vxi1OcpIjqzQOLIjUPp33gcl4SoM0jCYRmPls0dw_4bpN5cYpfrc129iPS7vwT6j-AI6_4MzJ7CPFMOOUJIdEVbkHG69VA-zvTPyrO0NHyXb1wTsD7no4AlmPTzxIoED3CwWt3Hy-ddwFQUdT-nPaRbNx3qZcitCOWgpGyzd2CvBfqV5vOCnq605aZRBsp7NLi36s7gWFdkKlRSTJ8E7qvzH3zFJ8XzdNrV0rwsxYdvQtejIOH4bdpPPfwE](https://mermaid.live/edit#pako:vZZRb6NGEMe_ymifclLuTm3f_EYwd6WxsWXwSa2Qqgk7treFXbI7JHXjfPdqweZwQnqtK9UPeFn-swz_-e3AkyiMJDERZKcKtxarXAMArB1ZOBzevzdPsCJH9gFZGQ0TyEVdYkEOrr6bJO9y8VqfGFYbVXwNsFSQehgNeerG_peyVXoLSsLyFnJRNEpe9eKBgCpUJay9ptHqvqFuZkSpsSLIhVSuLnHfno6oanTu0Vj5I7od5MJhySRheXM7_fQ97NDthjErUxJYf8jFOo1WcIBgOo-ToWaKTJmqCApLyCQD9knQBpuSQZvH86fq1U0tezU2bE4TJ_FzrrvBipxpbEEhMm2N3Q_q1M63nhfdRfXnS9tfRV9QgtbYYQWK02JveCzJFVbVLRF9bnuQxKhKd5l5r_x4i1csS-NvKYHNuBcXe5CLDRaqVLwHY4HuG1VXpPmf2YAVacWKnI91NRVuJKRNvdNbYyovLfBOaeL-0jAq1gwF1lj4lHLhCBkK02j2gY1WDPcNala8H7mXqnBLa1tCLkybJJaAzhFDvTNszvbB0bmUkRsHrvvLRfAliGfBzSyCA8yDOMmiJEhCfzaNwsV8HqdpvEii6XCtG2NKQg3W-2fJBXVtzQP6NB6N_X1TmkfYlLgdyfhEUizh023baTZkSfv29JLzD0r-z5u0h_Dtvthn-xLLPvYCMllx25_qxtbGka98RcT-kmvufqOCv4lmX35tmBx8BGQmLYnG96pjtNyOcpHF8yjNgvky--Xqh3cQOIUfQ1Oa6s6MxpKW_y5y4M5L-pZRMo2Tz74pL5erxZdoCgdYRT9FYdYOQ8_ibNaNF_PlLMrOUTyaYcm7pIxeEbpur8pKaaA_6hJ1Vxi1OcpIjqzQOLIjUPp33gcl4SoM0jCYRmPls0dw_4bpN5cYpfrc129iPS7vwT6j-AI6_4MzJ7CPFMOOUJIdEVbkHG69VA-zvTPyrO0NHyXb1wTsD7no4AlmPTzxIoED3CwWt3Hy-ddwFQUdT-nPaRbNx3qZcitCOWgpGyzd2CvBfqV5vOCnq605aZRBsp7NLi36s7gWFdkKlRSTJ8E7qvzH3zFJ8XzdNrV0rwsxYdvQtejIOH4bdpPPfwE)  
> - 🖼️ **Full-Screen SVG Diagram View:** [https://mermaid.live/view#pako:vZZRb6NGEMe_ymifclLuTm3f_EYwd6WxsWXwSa2Qqgk7treFXbI7JHXjfPdqweZwQnqtK9UPeFn-swz_-e3AkyiMJDERZKcKtxarXAMArB1ZOBzevzdPsCJH9gFZGQ0TyEVdYkEOrr6bJO9y8VqfGFYbVXwNsFSQehgNeerG_peyVXoLSsLyFnJRNEpe9eKBgCpUJay9ptHqvqFuZkSpsSLIhVSuLnHfno6oanTu0Vj5I7od5MJhySRheXM7_fQ97NDthjErUxJYf8jFOo1WcIBgOo-ToWaKTJmqCApLyCQD9knQBpuSQZvH86fq1U0tezU2bE4TJ_FzrrvBipxpbEEhMm2N3Q_q1M63nhfdRfXnS9tfRV9QgtbYYQWK02JveCzJFVbVLRF9bnuQxKhKd5l5r_x4i1csS-NvKYHNuBcXe5CLDRaqVLwHY4HuG1VXpPmf2YAVacWKnI91NRVuJKRNvdNbYyovLfBOaeL-0jAq1gwF1lj4lHLhCBkK02j2gY1WDPcNala8H7mXqnBLa1tCLkybJJaAzhFDvTNszvbB0bmUkRsHrvvLRfAliGfBzSyCA8yDOMmiJEhCfzaNwsV8HqdpvEii6XCtG2NKQg3W-2fJBXVtzQP6NB6N_X1TmkfYlLgdyfhEUizh023baTZkSfv29JLzD0r-z5u0h_Dtvthn-xLLPvYCMllx25_qxtbGka98RcT-kmvufqOCv4lmX35tmBx8BGQmLYnG96pjtNyOcpHF8yjNgvky--Xqh3cQOIUfQ1Oa6s6MxpKW_y5y4M5L-pZRMo2Tz74pL5erxZdoCgdYRT9FYdYOQ8_ibNaNF_PlLMrOUTyaYcm7pIxeEbpur8pKaaA_6hJ1Vxi1OcpIjqzQOLIjUPp33gcl4SoM0jCYRmPls0dw_4bpN5cYpfrc129iPS7vwT6j-AI6_4MzJ7CPFMOOUJIdEVbkHG69VA-zvTPyrO0NHyXb1wTsD7no4AlmPTzxIoED3CwWt3Hy-ddwFQUdT-nPaRbNx3qZcitCOWgpGyzd2CvBfqV5vOCnq605aZRBsp7NLi36s7gWFdkKlRSTJ8E7qvzH3zFJ8XzdNrV0rwsxYdvQtejIOH4bdpPPfwE](https://mermaid.live/view#pako:vZZRb6NGEMe_ymifclLuTm3f_EYwd6WxsWXwSa2Qqgk7treFXbI7JHXjfPdqweZwQnqtK9UPeFn-swz_-e3AkyiMJDERZKcKtxarXAMArB1ZOBzevzdPsCJH9gFZGQ0TyEVdYkEOrr6bJO9y8VqfGFYbVXwNsFSQehgNeerG_peyVXoLSsLyFnJRNEpe9eKBgCpUJay9ptHqvqFuZkSpsSLIhVSuLnHfno6oanTu0Vj5I7od5MJhySRheXM7_fQ97NDthjErUxJYf8jFOo1WcIBgOo-ToWaKTJmqCApLyCQD9knQBpuSQZvH86fq1U0tezU2bE4TJ_FzrrvBipxpbEEhMm2N3Q_q1M63nhfdRfXnS9tfRV9QgtbYYQWK02JveCzJFVbVLRF9bnuQxKhKd5l5r_x4i1csS-NvKYHNuBcXe5CLDRaqVLwHY4HuG1VXpPmf2YAVacWKnI91NRVuJKRNvdNbYyovLfBOaeL-0jAq1gwF1lj4lHLhCBkK02j2gY1WDPcNala8H7mXqnBLa1tCLkybJJaAzhFDvTNszvbB0bmUkRsHrvvLRfAliGfBzSyCA8yDOMmiJEhCfzaNwsV8HqdpvEii6XCtG2NKQg3W-2fJBXVtzQP6NB6N_X1TmkfYlLgdyfhEUizh023baTZkSfv29JLzD0r-z5u0h_Dtvthn-xLLPvYCMllx25_qxtbGka98RcT-kmvufqOCv4lmX35tmBx8BGQmLYnG96pjtNyOcpHF8yjNgvky--Xqh3cQOIUfQ1Oa6s6MxpKW_y5y4M5L-pZRMo2Tz74pL5erxZdoCgdYRT9FYdYOQ8_ibNaNF_PlLMrOUTyaYcm7pIxeEbpur8pKaaA_6hJ1Vxi1OcpIjqzQOLIjUPp33gcl4SoM0jCYRmPls0dw_4bpN5cYpfrc129iPS7vwT6j-AI6_4MzJ7CPFMOOUJIdEVbkHG69VA-zvTPyrO0NHyXb1wTsD7no4AlmPTzxIoED3CwWt3Hy-ddwFQUdT-nPaRbNx3qZcitCOWgpGyzd2CvBfqV5vOCnq605aZRBsp7NLi36s7gWFdkKlRSTJ8E7qvzH3zFJ8XzdNrV0rwsxYdvQtejIOH4bdpPPfwE)

---

## 2. Data Dictionary

### Table: `users`
Represents individuals interacting with the system (Regular Members / Interns and Platform Administrators).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(30)` | **PRIMARY KEY** (`cuid()`) | Unique alphanumeric identifier. |
| `email` | `VARCHAR(255)` | **UNIQUE, NOT NULL** | Work email address. |
| `name` | `VARCHAR(255)` | **NOT NULL** | User full name. |
| `passwordHash` | `TEXT` | **NOT NULL** | Salted PBKDF2 hash of the password. |
| `role` | `ENUM ('USER', 'ADMIN')` | **NOT NULL**, Default: `'USER'` | Access control role. |
| `createdAt` | `TIMESTAMP` | **NOT NULL**, Default: `now()` | Account creation timestamp. |
| `updatedAt` | `TIMESTAMP` | **NOT NULL**, Auto-updated | Last profile modification timestamp. |

---

### Table: `resource_categories`
Groups organizational resources into logical classifications (Meeting Rooms, Media Hardware, Labs).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(30)` | **PRIMARY KEY** (`cuid()`) | Unique category identifier. |
| `name` | `VARCHAR(100)` | **UNIQUE, NOT NULL** | Name of category (e.g. "Meeting & Conference Rooms"). |
| `description` | `TEXT` | `NULLABLE` | Explanation of resources in this category. |
| `createdAt` | `TIMESTAMP` | **NOT NULL**, Default: `now()` | Category creation timestamp. |

---

### Table: `resources`
The core physical assets, meeting spaces, and equipment shared across teams.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(30)` | **PRIMARY KEY** (`cuid()`) | Unique resource identifier. |
| `name` | `VARCHAR(255)` | **NOT NULL**, Compound **UNIQUE** `("categoryId", "name")` | Resource display name. Guaranteed unique within its parent category. |
| `description` | `TEXT` | `NULLABLE` | Equipment specs, seating capacity, or instructions. |
| `location` | `VARCHAR(255)` | `NULLABLE` | Physical room, floor, or storage cabinet. |
| `capacity` | `INTEGER` | **NOT NULL**, Default: `1` | Seating capacity or unit quantity available. |
| `imageUrl` | `TEXT` | `NULLABLE` | Photo reference. |
| `status` | `ENUM ('AVAILABLE', 'MAINTENANCE', 'DECOMMISSIONED')` | **NOT NULL**, Default: `'AVAILABLE'` | Real-time operational state. |
| `requiresApproval`| `BOOLEAN` | **NOT NULL**, Default: `false` | If `true`, reservations require admin confirmation. |
| `categoryId` | `VARCHAR(30)` | **FOREIGN KEY** &rarr; `resource_categories.id` (**`ON DELETE RESTRICT`**) | References parent category. Deletion of category is rejected if resources exist, eliminating orphaned resources. |
| `createdAt` | `TIMESTAMP(3)` | **NOT NULL**, Default: `now()` | Timestamp added. |
| `updatedAt` | `TIMESTAMP(3)` | **NOT NULL**, Auto-updated | Last modified. |

---

### Table: `reservations`
Booked time slots for shared resources. Stored with explicit microsecond timezone instants (`TIMESTAMPTZ(3)`) locked to the organization's timezone (`Asia/Colombo` / UTC+05:30).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(30)` | **PRIMARY KEY** (`cuid()`) | Unique booking identifier. |
| `title` | `VARCHAR(255)` | **NOT NULL** | Purpose of booking (e.g. "Sprint Planning"). |
| `description` | `TEXT` | `NULLABLE` | Meeting agenda or equipment requirements. |
| `startTime` | `TIMESTAMPTZ(3)` | **NOT NULL** | Reserved start instant in `Asia/Colombo`. |
| `endTime` | `TIMESTAMPTZ(3)` | **NOT NULL** | Reserved end instant in `Asia/Colombo`. |
| `status` | `ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED')` | **NOT NULL**, Default: `'PENDING'` | Lifecycle status of booking across 5 authoritative states. |
| `rejectionReason` | `TEXT` | `NULLABLE` | Feedback if rejected by admin. Mandatory on rejection. |
| `userId` | `VARCHAR(30)` | **FOREIGN KEY** &rarr; `users.id` (`ON DELETE CASCADE`) | User who reserved. |
| `resourceId` | `VARCHAR(30)` | **FOREIGN KEY** &rarr; `resources.id` (`ON DELETE CASCADE`) | Resource being reserved. |
| `createdAt` | `TIMESTAMPTZ(3)` | **NOT NULL**, Default: `now()` | When booking was submitted. |
| `updatedAt` | `TIMESTAMPTZ(3)` | **NOT NULL**, Auto-updated | Status transition timestamp. |

---

### Table: `notifications`
Durable in-app notification records dispatched upon reservation submission, administrative approvals, or rejections.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(30)` | **PRIMARY KEY** (`cuid()`) | Unique notification identifier. |
| `userId` | `VARCHAR(30)` | **FOREIGN KEY** &rarr; `users.id` (`ON DELETE CASCADE`) | Recipient user ID. |
| `title` | `VARCHAR(255)` | **NOT NULL** | Subject header (e.g. "Reservation Approved"). |
| `message` | `TEXT` | **NOT NULL** | Detailed notification payload or admin feedback. |
| `type` | `ENUM ('APPROVAL', 'REJECTION', 'BOOKING_CREATED', 'SYSTEM')` | **NOT NULL**, Default: `'SYSTEM'` | Notification classification. |
| `isRead` | `BOOLEAN` | **NOT NULL**, Default: `false` | Read receipt indicator. |
| `reservationId` | `VARCHAR(30)` | **FOREIGN KEY** &rarr; `reservations.id` (`ON DELETE SET NULL`) | Associated reservation reference. |
| `createdAt` | `TIMESTAMPTZ(3)` | **NOT NULL**, Default: `now()` | Generation timestamp. |

---

## 3. Database Indexes for Performance & Concurrency

1. **PostgreSQL GiST Exclusion Constraint with `tstzrange` (Hardware-Level Concurrency & Timezone Safety):**
   ```sql
   CREATE EXTENSION IF NOT EXISTS btree_gist;

   ALTER TABLE "reservations"
   ADD CONSTRAINT "no_overlapping_active_reservations"
   EXCLUDE USING gist (
     "resourceId" WITH =,
     tstzrange("startTime", "endTime", '[)') WITH &&
   )
   WHERE ("status" IN ('PENDING', 'APPROVED'));
   ```
   *Rationale:* Solves race conditions under high concurrent booking traffic across global and local timezones. Uses `tstzrange` with half-open intervals `'[)'` to ensure adjacent bookings (e.g., 10:00–11:00 followed by 11:00–12:00) are cleanly permitted, while true overlaps are physically rejected by the PostgreSQL storage engine with error `23P01 (exclusion_violation)`.

2. **Composite B-Tree Application Index:**
   ```sql
   CREATE INDEX "reservations_resourceId_startTime_endTime_idx" 
   ON "reservations" ("resourceId", "startTime", "endTime");
   ```
   *Rationale & Query Planner Characteristics:*  
   - Filters candidate reservations by exact equality on `resourceId` and establishes a starting boundary on `startTime`.
   - *Technical Nuance on Range Complexity:* Because the double-booking check applies inequalities across two distinct columns (`existing.startTime < newEnd AND existing.endTime > newStart`), a B-tree cannot perform a pure $O(\log N)$ point search on `endTime`. The query engine scans matching `resourceId` and `startTime` index entries and evaluates `endTime` as a candidate filter condition.
   - *Empirical Analysis:* In moderate-sized datasets (1,000+ rows), PostgreSQL's cost-based optimizer may favor reading cached shared buffers directly (`Seq Scan` over ~23 buffer pages) or a `Bitmap Index Scan`. Full query plans and buffer analysis are documented in [docs/INDEXING_BENCHMARK.md](docs/INDEXING_BENCHMARK.md).
   - *Separation of Concerns:* The B-tree optimizes application read paths, whereas the GiST exclusion constraint guarantees **correctness under concurrency** (preventing race conditions at the ACID storage engine level).

3. **User Dashboard Index:**
   ```sql
   CREATE INDEX "reservations_userId_idx" ON "reservations" ("userId");
   ```
   *Rationale:* Optimizes "My Reservations" queries for instant loading.

4. **Status Queue Index:**
   ```sql
   CREATE INDEX "reservations_status_idx" ON "reservations" ("status");
   ```
   *Rationale:* Accelerates the Administrator Pending Approval queue.

5. **Resource Scoped Uniqueness Index:**
   ```sql
   CREATE UNIQUE INDEX "resources_categoryId_name_key" ON "resources" ("categoryId", "name");
   ```
   *Rationale:* Enforces scoped name uniqueness per category at the physical storage layer.

6. **Notification Inboxes & Real-Time Query Indexes:**
   ```sql
   CREATE INDEX "notifications_userId_isRead_idx" ON "notifications" ("userId", "isRead");
   CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications" ("userId", "createdAt");
   ```
   *Rationale:* Powers instant unread notification badge counts (`userId, isRead`) and chronological notification history feeds (`userId, createdAt`).

---

## 4. Architectural Integrity & Schema Invariants (Assessment Finding 6 Alignment)

To eliminate documentation divergence and ensure institutional reliability across all artifacts, the following invariants are enforced:

### 1. Single Authoritative Source of Truth
The Prisma schema file ([prisma/schema.prisma](prisma/schema.prisma)) is the sole source of truth for the database structure. Both the Visual ER Diagram (Mermaid), the Interactive Live Editor link, the Data Dictionary, and the project [README.md](README.md) are derived directly from this schema. All 5 `ReservationStatus` enum values (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, `COMPLETED`) and all model attributes are 100% synchronized across every document.

### 2. Category Cascade Policy & Orphan Prevention
- **Decision:** Category deletion employs `onDelete: Restrict` in PostgreSQL foreign key constraints (`category ResourceCategory @relation(fields: [categoryId], references: [id], onDelete: Restrict)`).
- **Guarantee:** An administrator cannot accidentally delete a `ResourceCategory` if resources are currently linked to it. The relational engine raises a foreign key violation (`23503`), preventing orphaned resources and preserving audit trails for historical bookings.

### 3. Resource Name Uniqueness Scope
- **Decision:** Resource names are unique **within their respective category** (`@@unique([categoryId, name])`), rather than globally unique.
- **Rationale:** Different departments or categories may share common equipment designations (e.g., both "Conference Rooms" and "Laboratories" may host a "Pod 1" or "Screen 01"). Scoping uniqueness to `(categoryId, name)` prevents accidental duplicates within the same department while allowing autonomous naming conventions across distinct organizational categories.

### 4. Clean-Slate Migration Pipeline Reproducibility
The database migration pipeline is strictly version-controlled via Prisma Migrate and consists of sequential, deterministic SQL migrations:
1. `20261012214214_init`: Initial table structures, foreign keys, and indexes.
2. `20261013101500_add_exclusion_constraint`: PostgreSQL `btree_gist` extension and GiST exclusion constraint for concurrency safety.
3. `20261013110000_update_timestamptz`: Standardized `TIMESTAMPTZ(3)` microsecond precision with timezone support.
4. `20261013120000_add_resource_category_unique_constraint`: Scoped unique constraint on `("categoryId", "name")`.

Executing `npx prisma migrate reset` or `npx prisma migrate deploy` on any clean PostgreSQL instance deterministically reconstructs the production database without drift or manual intervention.

