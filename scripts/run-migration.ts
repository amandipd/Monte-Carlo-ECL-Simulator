import fs from 'fs';
import path from 'path';
import pool from '../src/config/db';

async function runMigrations() {
    const migrationsDir = path.resolve(process.cwd(), 'database', 'migrations');

    const files = fs.readdirSync(migrationsDir);
    const sqlFiles = files.filter(file => file.endsWith('.sql') && !file.startsWith('000'));
    const sortedFiles = sqlFiles.sort();

    console.log('Running migrations...\n');

    try {
        for (const file of sortedFiles) {
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            console.log(`Running: ${file}`);
            try {
                await pool.query(sql);
                console.log(`✅ ${file} completed\n`);
            } catch (error: any) {
                // Handle "already exists" errors gracefully (tables, indexes, etc.)
                // 42P07 = duplicate_object (table/index already exists)
                // 23505 = unique_violation (constraint violation)
                // 42P16 = invalid_table_definition (but might be from partial migration)
                if (error.code === '42P07' || error.code === '23505') {
                    console.log(`⚠️  ${file} - Some objects already exist, skipping...\n`);
                } else if (error.code === '42P01') {
                    // 42P01 = undefined_table - table doesn't exist (dependency issue)
                    console.error(`❌ ${file} failed: ${error.message}`);
                    console.error(`   This might be because a previous migration was skipped.`);
                    console.error(`   Try dropping and recreating the database, or manually fix the issue.\n`);
                    throw error;
                } else {
                    // Re-throw other errors
                    throw error;
                }
            }
        }

        console.log('🎉 All migrations completed successfully!');

        // Verify tables were created
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        console.log('\n📊 Created tables:');
        result.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });

    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        await pool.end();
        console.log('\nDatabase connection closed.');
    }
}

runMigrations();
