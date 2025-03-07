const express = require('express');
const router = express.Router();
const Event = require("./vinay_model");

router.get('/events', async (req, res) => {
  try {
    const events = await Event.find({});
    res.status(200).json({ 
      success: true, 
      message: 'Events retrieved successfully',
      data: events
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve events',
      error: error.message
    });
  }
});

router.get('/events/:id', async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId);
    
    res.status(200).json({ 
      success: true, 
      message: `Event retrieved successfully`,
      data: event 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve event',
      error: error.message
    });
  }
});

router.post('/events', async (req, res) => {
  try {
    const eventData = req.body;
    
    const requiredFields = [
      'clubName', 'eventName', 'eventLink', 'registrationFee', 
      'eventLocation', 'applicationDeadline', 'limitedregistrations', 
      'EventDate', 'prizePool', 'firstPrizeMoney', 'secondPrizeMoney', 
      'thirdPrizeMoney', 'credits', 'typeofCredit', 'noofCredits',
      'contactName1', 'contactName2', 'contactName3', 
      'contactDetails1', 'contactDetails2', 'contactDetails3'
    ];
    
    for (const field of requiredFields) {
      if (!eventData[field]) {
        return res.status(400).json({ 
          success: false, 
          message: `${field} is required`
        });
      }
    }
    
    const newEvent = await Event.create(eventData);
    
    res.status(201).json({ 
      success: true, 
      message: 'Event created successfully',
      data: newEvent 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create event',
      error: error.message
    });
  }
});

router.put('/events/:id', async (req, res) => {
  try {
    const eventId = req.params.id;
    const eventData = req.body;
    
    const updatedEvent = await Event.findByIdAndUpdate(eventId, eventData, { new: true });
    if (!updatedEvent) return res.status(404).json({ success: false, message: 'Event not found' });
    
    res.status(200).json({ 
      success: true, 
      message: `Event updated successfully`,
      data: eventData
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update event',
      error: error.message
    });
  }
});

router.patch('/events/:id/close', async (req, res) => {
  try {
    const eventId = req.params.id;
    
    const updatedEvent = await Event.findByIdAndUpdate(eventId, { isclosed: true });
    if (!updatedEvent) return res.status(404).json({ success: false, message: 'Event not found' });
    res.status(200).json({ 
      success: true, 
      message: `Event closed successfully`,
      data: { isclosed: true }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to close event',
      error: error.message
    });
  }
});

router.delete('/events/:id', async (req, res) => {
  try {
    const eventId = req.params.id;
    
    const deletedEvent = await Event.findByIdAndDelete(eventId);
    if (!deletedEvent) return res.status(404).json({ success: false, message: 'Event not found' });
    
    res.status(200).json({ 
      success: true, 
      message: `Event deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete event',
      error: error.message
    });
  }
});

module.exports = router;
