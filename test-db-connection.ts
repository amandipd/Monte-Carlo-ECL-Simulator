import pool from './config_db';

async function testConnection() {
    try {
        console.log('Testing database connection...');
        console.log('Connection config:', {
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_DATABASE,
            port: process.env.DB_PORT,
            password: process.env.DB_PASSWORD ? '***' : 'MISSING'
        });
        
        // Test query
        const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
        
        console.log('✅ Database connection successful!');
        console.log('Current time:', result.rows[0].current_time);
        console.log('PostgreSQL version:', result.rows[0].pg_version.split(',')[0]);
        
        // Test if database is empty
        const tableCheck = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        
        console.log(`\n📊 Tables in database: ${tableCheck.rows.length}`);
        if (tableCheck.rows.length > 0) {
            console.log('Existing tables:', tableCheck.rows.map((r: { table_name: string }) => r.table_name).join(', '));
        } else {
            console.log('Database is empty - ready for migrations!');
        }
        
    } catch (error: any) {
        console.error('❌ Database connection failed!');
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Full error:', error);
        
        // More specific error handling
        if (error.message.includes('password authentication failed') || error.code === '28P01') {
            console.error('\n💡 Fix: Password authentication failed');
            console.error('   - Check your DB_PASSWORD in .env file');
            console.error('   - Make sure the password matches your PostgreSQL user password');
        } else if (error.message.includes('does not exist') || error.code === '3D000') {
            console.error('\n💡 Fix: Database does not exist');
            console.error(`   - Create the database: CREATE DATABASE ${process.env.DB_DATABASE};`);
            console.error('   - Or update DB_DATABASE in .env to an existing database');
        } else if (error.message.includes('ECONNREFUSED') || error.code === 'ECONNREFUSED') {
            console.error('\n💡 Fix: Connection refused');
            console.error('   - Make sure PostgreSQL is running');
            console.error(`   - Check DB_HOST (${process.env.DB_HOST}) and DB_PORT (${process.env.DB_PORT})`);
            console.error('   - Try: Check Windows Services for PostgreSQL');
        } else if (error.message.includes('timeout') || error.code === 'ETIMEDOUT') {
            console.error('\n💡 Fix: Connection timeout');
            console.error('   - PostgreSQL might not be running');
            console.error('   - Firewall might be blocking the connection');
        } else if (error.code === 'ENOTFOUND') {
            console.error('\n💡 Fix: Host not found');
            console.error(`   - Check DB_HOST: ${process.env.DB_HOST}`);
            console.error('   - Should be "localhost" or a valid hostname');
        } else {
            console.error('\n💡 Unknown error - check the error details above');
        }
    } finally {
        await pool.end();
        console.log('\nConnection closed.');
    }
}

testConnection();