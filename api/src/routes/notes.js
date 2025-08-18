require('dotenv').config();
const express = require('express');
const {z} = require('zod');
const Note = require('../models/Notes');
const dayjs = require('dayjs');
const log = require('../logger');
const router = express.Router();
const {Queue} = require('bullmq');

const createSchema=z.object({
    title:z.string().min(1).max(200),
    body:z.string().min(1).max(1000),
    releaseAt: z.string().datetime(),
    webhookUrl: z.string().url(),
})

function getQueue(){
     return new Queue('deliveries',{connection:{url:process.env.REDIS_URL}});
}

router.post('/', async(req,res)=>{

    try{
       const parsed = createSchema.safeParse(req.body);
       if(!parsed.success){
        return res.status(400).json({error:'Invalid payload', issues: parsed.error.issues});
       }
       const {title,body,releaseAt,webhookUrl} = parsed.data;
       const releaseDate = dayjs(releaseAt).toDate();
       
       const note=await Note.crete({title,body,releaseAt:releaseDate,webhookUrl,status:'pending'});
       if(dayjs(releaseDate).isBefore(dayjs())){
        const q =getQueue();
        await q.add('deliver',{noteId: note._id.toString()});
       }
       return res.status(201).json({id:note._id.toString(), message:'Note created successfully'});

    }catch(err){
        log.error({err},'Error creating note');
        return res.status(500).json({error:'server error'});
    }
})

router.get('/', async (req, res) => {
 try {
  const status = req.query.status;
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const PAGE_SIZE = 20;

  const filter = {};
  if (status) {
   filter.status = status;
  }
  const total = await Note.countDocuments(filter);

  const items = await Note.find(filter)
   .sort({ createdAt: -1 })
   .skip((page - 1) * PAGE_SIZE)
   .limit(PAGE_SIZE)
   .lean();

  const mapped = items.map((n) => ({
   id: n._id.toString(),
   title: n.title,
   status: n.status,
   releaseAt: n.releaseAt,
   webhookUrl: n.webhookUrl,
   deliveredAt: n.deliveredAt,
   lastAttemptCode: n.attempts?.length ? n.attempts[n.attempts.length - 1].statusCode : null
  }));

  return res.json({ page, pageSize: PAGE_SIZE, total, items: mapped });
 } catch (err) {
  return res.status(500).json({ error: 'Server error' });
 }
});

router.post('/:id/replay', async(req,res)=>{
    const id = req.params.id;
    const note= await Note.findById(id);
    if(!note) return res.status(404).json({error:'Note not found'});

    if(!['failed','dead'].includes(note.status)){
        return res.status(400).json({error:'Note is not in a replayable state'});
    }
    note.status='pending';
    await note.save();

    const q= getQueue();
    await q.add('deliver', {
        noteId: note._id.toString()
    });
    return res.json({message:'Note replayed successfully'});
});

module.exports = router;