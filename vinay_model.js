const mongoose=require("mongoose");
const { required } = require("yargs");
const FormSchema = new mongoose.Schema({ 
    clubName: {type: String, required: true}, 
    eventName: {type: String, required: true}, 
    eventLink: {type: String, required: true}, 
    registrationFee: {type: Number, required: true}, 
    eventLocation: {type: Number, required: true}, 
    applicationDeadline: {type: String, required: true}, 
    limitedregistrations: {type: Boolean, required: true}, 
    EventDate: {type: String, required: true}, 
    prizePool: {type: Number, required: true}, 
    firstPrizeMoney: {type: Number, required: true}, 
    secondPrizeMoney: {type: Number, required: true}, 
    thirdPrizeMoney: {type: Number, required: true}, 
    credits: {type: Boolean, 
    required: 
    true}, 
    typeofCredit: {type: String, required: true}, 
    noofCredits: {type: String, 
    required: true}, 
    eventDescription: {type: String}, 
    contactName1: {type: String, required: true}, 
    contactName2: {type: String, required: true}, 
    contactName3: {type: String, required: true}, 
    contactDetails1: {type: Number, required: true}, 
    contactDetails2: {type: Number, 
    required: true}, 
    contactDetails3: {type: Number, required: true}, 
    isclosed:{type:Boolean,default:false}
    });
const model=mongoose.model("events",FormSchema)
module.exports=model