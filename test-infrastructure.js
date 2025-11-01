const { S3Client, ListBucketsCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');
const amqp = require('amqplib');
const { Client } = require('pg');

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
};

async function checkPostgreSQL() {
    console.log(`\n${colors.yellow}Testing PostgreSQL...${colors.reset}`);
    const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'syncsearch',
        password: 'devpassword',
        database: 'syncsearch',
    });

    try {
        await client.connect();
        const result = await client.query('SELECT NOW() as current_time, version()');
        console.log(`${colors.green}✅ PostgreSQL Connected${colors.reset}`);
        console.log(`   Time: ${result.rows[0].current_time}`);
        console.log(`   Version: ${result.rows[0].version.split(',')[0]}`);
        await client.end();
        return true;
    } catch (error) {
        console.log(`${colors.red}❌ PostgreSQL Failed: ${error.message}${colors.reset}`);
        return false;
    }
}

async function checkRabbitMQ() {
    console.log(`\n${colors.yellow}Testing RabbitMQ...${colors.reset}`);
    try {
        const connection = await amqp.connect('amqp://syncsearch:devpassword@localhost:5672');
        const channel = await connection.createChannel();
        
        // Declare a test queue
        await channel.assertQueue('test-queue', { durable: false });
        
        console.log(`${colors.green}✅ RabbitMQ Connected${colors.reset}`);
        console.log(`   Test queue created: test-queue`);
        console.log(`   Management UI: http://localhost:15672`);
        
        // Clean up
        await channel.deleteQueue('test-queue');
        await channel.close();
        await connection.close();
        return true;
    } catch (error) {
        console.log(`${colors.red}❌ RabbitMQ Failed: ${error.message}${colors.reset}`);
        return false;
    }
}

async function checkMinio() {
    console.log(`\n${colors.yellow}Testing Minio (S3)...${colors.reset}`);
    const s3Client = new S3Client({
        endpoint: 'http://localhost:9000',
        region: 'us-east-1',
        credentials: {
            accessKeyId: 'minioadmin',
            secretAccessKey: 'minioadmin',
        },
        forcePathStyle: true,
    });

    try {
        // List buckets
        const listCommand = new ListBucketsCommand({});
        const buckets = await s3Client.send(listCommand);
        
        console.log(`${colors.green}✅ Minio Connected${colors.reset}`);
        console.log(`   Current buckets: ${buckets.Buckets?.length || 0}`);
        
        // Try to create the syncsearch-media bucket
        try {
            const createCommand = new CreateBucketCommand({ Bucket: 'syncsearch-media' });
            await s3Client.send(createCommand);
            console.log(`   Created bucket: syncsearch-media`);
        } catch (error) {
            if (error.name === 'BucketAlreadyOwnedByYou') {
                console.log(`   Bucket already exists: syncsearch-media`);
            } else {
                throw error;
            }
        }
        
        console.log(`   Console UI: http://localhost:9001`);
        return true;
    } catch (error) {
        console.log(`${colors.red}❌ Minio Failed: ${error.message}${colors.reset}`);
        return false;
    }
}

async function runAllTests() {
    console.log(`${colors.cyan}
╔════════════════════════════════════════════╗
║   SyncSearch Infrastructure Health Check   ║
╚════════════════════════════════════════════╝${colors.reset}`);

    const results = {
        postgres: await checkPostgreSQL(),
        rabbitmq: await checkRabbitMQ(),
        minio: await checkMinio(),
    };

    console.log(`\n${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}Summary:${colors.reset}`);
    console.log(`  PostgreSQL: ${results.postgres ? colors.green + '✅ Ready' : colors.red + '❌ Failed'}${colors.reset}`);
    console.log(`  RabbitMQ:   ${results.rabbitmq ? colors.green + '✅ Ready' : colors.red + '❌ Failed'}${colors.reset}`);
    console.log(`  Minio (S3): ${results.minio ? colors.green + '✅ Ready' : colors.red + '❌ Failed'}${colors.reset}`);

    const allPassed = Object.values(results).every(r => r);
    
    if (allPassed) {
        console.log(`\n${colors.green}🎉 All services are ready! You can start building your application.${colors.reset}`);
        console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
        console.log(`  1. Install API service dependencies: cd api-service && npm install`);
        console.log(`  2. Create database schema`);
        console.log(`  3. Start the API service: npm run start:dev`);
    } else {
        console.log(`\n${colors.red}⚠️  Some services failed. Check Docker logs:${colors.reset}`);
        console.log(`  docker-compose logs postgres`);
        console.log(`  docker-compose logs rabbitmq`);
        console.log(`  docker-compose logs minio`);
    }
    
    console.log('');
}

// Run tests
runAllTests().catch(console.error);
