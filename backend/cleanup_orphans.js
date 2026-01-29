
import mongoose from 'mongoose';
import Upload from './src/models/Upload.js';
import Record from './src/models/Record.js';
import User from './src/models/User.js';

mongoose.connect('mongodb://127.0.0.1:27017/reconciliation_checker')
    .then(async () => {
        console.log("Connected to DB");

        const systemUploads = await Upload.find({ isSystemLoad: true });
        const validUploadIds = systemUploads.map(u => u._id.toString());

        // Find orphans
        const orphans = await Record.deleteMany({
            isSystemRecord: true,
            uploadJobId: { $nin: validUploadIds }
        });

        console.log(`\nSuccessfully deleted ${orphans.deletedCount} orphaned system records.`);

        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
