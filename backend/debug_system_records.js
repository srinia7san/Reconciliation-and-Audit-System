
import mongoose from 'mongoose';
import Upload from './src/models/Upload.js';
import Record from './src/models/Record.js';
import User from './src/models/User.js'; // Register model

mongoose.connect('mongodb://127.0.0.1:27017/reconciliation_checker')
    .then(async () => {
        console.log("Connected to DB");

        const systemUploads = await Upload.find({ isSystemLoad: true });
        console.log(`\n--- Active System Record Batches: ${systemUploads.length} ---`);
        systemUploads.forEach(u => console.log(`- ID: ${u._id}, File: ${u.filename}, Date: ${u.createdAt}`));

        const totalSystemRecords = await Record.countDocuments({ isSystemRecord: true });
        console.log(`\nTotal 'isSystemRecord: true' records in DB: ${totalSystemRecords}`);

        // Check for "Orphaned" records (records that claim to be system records but point to a non-existent upload job)
        const validUploadIds = systemUploads.map(u => u._id.toString());
        const orphans = await Record.countDocuments({
            isSystemRecord: true,
            uploadJobId: { $nin: validUploadIds }
        });
        console.log(`Orphaned System Records (no valid parent Upload): ${orphans}`);

        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
