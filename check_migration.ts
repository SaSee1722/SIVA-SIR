// Test script to check if database migration was run
import { getSharedSupabaseClient } from './template/core/client';

async function checkMigration() {
    const supabase = getSharedSupabaseClient();

    console.log('🔍 Checking if database migration was run...\n');

    try {
        // Try to query the is_approved column
        const { data, error } = await supabase
            .from('profiles')
            .select('id, name, email, role, is_approved, device_id')
            .eq('role', 'student')
            .limit(5);

        if (error) {
            if (error.message?.includes('is_approved') || error.message?.includes('column')) {
                console.log('❌ MIGRATION NOT RUN');
                console.log('   The is_approved column does not exist in the database.');
                console.log('\n📝 You need to run the migration:');
                console.log('   1. Open Supabase Dashboard → SQL Editor');
                console.log('   2. Copy SQL from: supabase-migrations/add_security_columns.sql');
                console.log('   3. Run the SQL');
                console.log('   4. Reload your app\n');
                return false;
            }
            throw error;
        }

        console.log('✅ MIGRATION WAS RUN SUCCESSFULLY!');
        console.log('   The is_approved and device_id columns exist.\n');

        if (data && data.length > 0) {
            console.log('📊 Sample student data:');
            data.forEach((student, index) => {
                console.log(`   ${index + 1}. ${student.name}`);
                console.log(`      Email: ${student.email}`);
                console.log(`      Approved: ${student.is_approved ?? 'NULL (defaults to true)'}`);
                console.log(`      Device ID: ${student.device_id || 'Not bound'}`);
                console.log('');
            });
        } else {
            console.log('ℹ️  No students found in database');
        }

        return true;
    } catch (error: any) {
        console.error('❌ Error checking migration:', error.message);
        return false;
    }
}

// Run the check
checkMigration().then((success) => {
    if (success) {
        console.log('✨ Everything looks good!');
    } else {
        console.log('⚠️  Please run the migration to enable approval functionality.');
    }
    process.exit(success ? 0 : 1);
});
