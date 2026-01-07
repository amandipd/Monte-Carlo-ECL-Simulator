# Next Steps Guide: Building the Database Layer & API

## 🎯 Current Status

✅ **Completed:**
- All calculation modules (M1: Amortization, M2: Risk Decay, M3: Discounting, ECL Calculator)
- Database connection configured and tested
- Database schema/migrations created
- TypeScript types defined

⏳ **Next Phase:**
- Run database migrations
- Create database service layer
- Build REST API endpoints
- Integrate calculations with database

---

## 📋 Step-by-Step Implementation Guide

### **Step 1: Run Database Migrations**

**Goal:** Create all the database tables in your PostgreSQL database.

**What you'll learn:**
- How to execute SQL migration files programmatically
- Database schema setup

**Tasks:**

1. **Create a migration runner script** (`scripts/run-migrations.ts`):
   - Read all SQL files from `database/migrations/` directory
   - Execute them in order (001, 002, 003, etc.)
   - Handle errors gracefully
   - Show which migrations ran successfully

2. **Key concepts:**
   - Use `fs.readFileSync()` to read SQL files
   - Use `pool.query()` to execute SQL
   - Execute migrations sequentially (await each one)
   - Log progress for each migration

3. **Test it:**
   ```bash
   npx ts-node scripts/run-migrations.ts
   ```

4. **Verify:**
   - Check that all tables were created
   - Verify with: `npx ts-node tests/test-db-connection.ts` (should show tables)

**Hints:**
- Migration files are numbered: `001_`, `002_`, etc.
- Use `path.join()` to build file paths
- Wrap each migration in a try-catch
- Use `pool.query()` to execute SQL

---

### **Step 2: Create Database Service Layer**

**Goal:** Create functions to interact with the database (CRUD operations).

**What you'll learn:**
- Repository pattern
- Database query patterns
- Error handling for database operations
- Type safety with database results

**File structure to create:**
```
src/
└── services/
    ├── portfolioService.ts
    ├── loanService.ts
    └── eclService.ts
```

#### **2.1: Portfolio Service** (`src/services/portfolioService.ts`)

**Functions to implement:**

1. **`createPortfolio(name: string, description?: string)`**
   - Insert a new portfolio into `portfolios` table
   - Return the created portfolio with its ID
   - Handle duplicate name errors

2. **`getPortfolioById(id: number)`**
   - Query portfolio by ID
   - Return null if not found

3. **`getAllPortfolios()`**
   - Get all portfolios
   - Return array of portfolios

**Key concepts:**
- Use parameterized queries: `pool.query('INSERT INTO ... VALUES ($1, $2)', [value1, value2])`
- Always use parameterized queries to prevent SQL injection
- Return typed results matching your TypeScript interfaces

**Example structure:**
```typescript
import pool from '../config/db';

export async function createPortfolio(name: string, description?: string) {
    const result = await pool.query(
        'INSERT INTO portfolios (name, description) VALUES ($1, $2) RETURNING *',
        [name, description || null]
    );
    return result.rows[0];
}
```

---

#### **2.2: Loan Service** (`src/services/loanService.ts`)

**Functions to implement:**

1. **`createLoan(loanData: Loan)`**
   - Insert loan into `loans` table
   - Validate required fields
   - Handle foreign key constraints (portfolio_id, collateral_id)

2. **`getLoanById(id: number)`**
   - Get loan by ID with all details

3. **`getLoansByPortfolio(portfolioId: number)`**
   - Get all loans for a specific portfolio

4. **`updateLoan(id: number, updates: Partial<Loan>)`**
   - Update loan fields
   - Only update provided fields

**Key concepts:**
- Foreign key relationships (portfolio_id, collateral_id)
- Partial updates (only update fields that are provided)
- Type validation using your `Loan` interface from `src/types/index.ts`

**Hints:**
- Use `Object.keys()` and `Object.values()` for dynamic updates
- Build UPDATE queries dynamically based on provided fields
- Always validate foreign keys exist before inserting

---

#### **2.3: ECL Service** (`src/services/eclService.ts`)

**Functions to implement:**

1. **`calculateAndStoreECL(loanId: number)`**
   - Get loan data from database
   - Call your `calculateTotalECL()` function
   - Insert result into `ecl_results` table
   - Insert monthly breakdown into `ecl_monthly_projections` table
   - Return the ECL result

2. **`getECLResult(loanId: number)`**
   - Get ECL result for a loan
   - Include monthly projections

3. **`getECLProjections(eclResultId: number)`**
   - Get monthly projections for an ECL result

**Key concepts:**
- Transaction handling (optional but recommended)
- Combining calculation logic with database operations
- Storing arrays (monthly breakdown) as multiple rows

**Hints:**
- Use `pool.query()` for single operations
- For multiple related inserts, consider using a transaction:
  ```typescript
  const client = await pool.connect();
  try {
      await client.query('BEGIN');
      // ... multiple queries
      await client.query('COMMIT');
  } catch (error) {
      await client.query('ROLLBACK');
      throw error;
  } finally {
      client.release();
  }
  ```

---

### **Step 3: Build REST API with Express**

**Goal:** Create HTTP endpoints to interact with your system.

**What you'll learn:**
- REST API design
- Express.js routing
- Request/response handling
- Error handling middleware

**File to create:** `src/server.ts` or `app.ts` (update existing)

#### **3.1: Setup Express Server**

**Tasks:**

1. **Install Express types** (if not already):
   ```bash
   npm install --save-dev @types/express
   ```

2. **Create basic Express server:**
   - Import Express
   - Create app instance
   - Add JSON middleware: `app.use(express.json())`
   - Add error handling middleware
   - Start server on a port (e.g., 3000)

3. **Basic structure:**
   ```typescript
   import express from 'express';
   const app = express();
   app.use(express.json());
   
   // Routes will go here
   
   const PORT = process.env.PORT || 3000;
   app.listen(PORT, () => {
       console.log(`Server running on port ${PORT}`);
   });
   ```

---

#### **3.2: Create API Routes**

**Routes to implement:**

**Portfolios:**
- `POST /api/portfolios` - Create a portfolio
- `GET /api/portfolios` - Get all portfolios
- `GET /api/portfolios/:id` - Get portfolio by ID

**Loans:**
- `POST /api/loans` - Create a loan
- `GET /api/loans/:id` - Get loan by ID
- `GET /api/portfolios/:portfolioId/loans` - Get loans by portfolio
- `PUT /api/loans/:id` - Update a loan

**ECL:**
- `POST /api/loans/:loanId/calculate-ecl` - Calculate and store ECL for a loan
- `GET /api/loans/:loanId/ecl` - Get ECL result for a loan
- `GET /api/loans/:loanId/ecl/projections` - Get monthly ECL projections

**Key concepts:**
- RESTful URL design
- HTTP status codes (200, 201, 404, 400, 500)
- Request validation
- Error handling

**Example route structure:**
```typescript
app.post('/api/portfolios', async (req, res) => {
    try {
        const { name, description } = req.body;
        
        // Validate input
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        
        // Call service
        const portfolio = await createPortfolio(name, description);
        
        // Return response
        res.status(201).json(portfolio);
    } catch (error: any) {
        console.error('Error creating portfolio:', error);
        res.status(500).json({ error: error.message });
    }
});
```

**Hints:**
- Use `async/await` for all route handlers
- Always validate request body
- Use try-catch for error handling
- Return appropriate HTTP status codes
- Use `res.json()` for JSON responses

---

### **Step 4: Add Helper Functions**

**Goal:** Create utility functions for common operations.

**File to create:** `src/services/pdService.ts`

**Functions to implement:**

1. **`getPDFromFICO(fico: number, version?: number)`**
   - Query `pd_benchmarks` table
   - Find FICO score range that matches
   - Return annual PD
   - Default to latest version if not specified

**Key concepts:**
- Range queries (WHERE fico >= fico_min AND fico <= fico_max)
- Default parameter values
- Handling missing data

---

### **Step 5: Integration & Testing**

**Goal:** Test the complete flow end-to-end.

**Test scenarios:**

1. **Create Portfolio → Create Loan → Calculate ECL → Retrieve Results**
   ```typescript
   // 1. Create portfolio
   const portfolio = await createPortfolio('Test Portfolio');
   
   // 2. Create loan
   const loan = await createLoan({
       portfolio_id: portfolio.id,
       loan_amount: 10000,
       // ... other fields
   });
   
   // 3. Calculate ECL
   const eclResult = await calculateAndStoreECL(loan.id);
   
   // 4. Retrieve ECL
   const retrieved = await getECLResult(loan.id);
   ```

2. **Test via API:**
   - Use Postman, curl, or Thunder Client
   - Test each endpoint
   - Verify data is stored correctly

---

## 🎓 Learning Objectives

By completing these steps, you'll learn:

1. **Database Operations:**
   - SQL query execution
   - Parameterized queries (security)
   - Foreign key relationships
   - Transactions

2. **Service Layer Pattern:**
   - Separation of concerns
   - Reusable functions
   - Error handling

3. **REST API Design:**
   - HTTP methods and status codes
   - Request/response patterns
   - API structure

4. **Integration:**
   - Connecting calculation logic with database
   - End-to-end data flow
   - Testing strategies

---

## 💡 Implementation Tips

1. **Start Small:**
   - Implement one function at a time
   - Test each function before moving on
   - Use console.log to debug

2. **Error Handling:**
   - Always wrap database calls in try-catch
   - Return meaningful error messages
   - Log errors for debugging

3. **Type Safety:**
   - Use your TypeScript interfaces
   - Type your function parameters and return values
   - Let TypeScript catch errors early

4. **Testing:**
   - Test each service function individually
   - Test API endpoints with real requests
   - Verify data in database after operations

5. **Code Organization:**
   - Keep services focused (one responsibility)
   - Use consistent naming conventions
   - Add comments for complex logic

---

## 📝 Suggested Implementation Order

1. ✅ Run migrations (Step 1)
2. ✅ Portfolio service (Step 2.1)
3. ✅ Loan service (Step 2.2)
4. ✅ ECL service (Step 2.3)
5. ✅ Express server setup (Step 3.1)
6. ✅ API routes (Step 3.2)
7. ✅ Helper functions (Step 4)
8. ✅ Integration testing (Step 5)

---

## 🚀 Getting Started

**Your first task:** Create `scripts/run-migrations.ts` and run your database migrations!

Good luck! Remember, the goal is to learn, so take your time and understand each concept before moving to the next step. 🎓
