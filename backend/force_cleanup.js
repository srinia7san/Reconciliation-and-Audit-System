
import mongoose from 'mongoose';
import Upload from './src/models/Upload.js';
import Record from './src/models/Record.js';
import User from './src/models/User.js';

mongoose.connect('mongodb://127.0.0.1:27017/reconciliation_checker')
    .then(async () => {
        console.log("Connected to DB");

        // 1. Get all valid System Upload IDs
        const systemUploads = await Upload.find({ isSystemLoad: true });
        const validUploadIds = systemUploads.map(u => u._id);
        console.log(`Valid System Upload Batches: ${validUploadIds.length}`);

        // 2. Find records that claim to be system records but have no matching Upload ID
        const orphans = await Record.countDocuments({
            isSystemRecord: true,
            uploadJobId: { $nin: validUploadIds }
        });
        console.log(`Found ${orphans} orphaned ghost records.`);

        if (orphans > 0) {
            const result = await Record.deleteMany({
                isSystemRecord: true,
                uploadJobId: { $nin: validUploadIds }
            });
            console.log(`✅ DELETED ${result.deletedCount} ghost records.`);
        } else {
            console.log("No ghost records found. System is clean.");
        }

        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
