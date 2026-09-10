import { Router } from 'express';
import { bulkImport } from '../controller/ticketController.js';
import { createFileUpload } from '../middlewares/createFileUpload.js';

const router = Router();

//router.post('/', createTicket);
router.post('/bulk-import',
    createFileUpload({
        maxFileSizeBytes: (100*1024*1024), // 100 MB
        maxFiles: 1 // 1 file
    }).single('file'),
    bulkImport
);

export default router;
