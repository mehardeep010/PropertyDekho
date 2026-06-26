// KYA KAR RAHA HAI: PROPERTY ki saari BUSINESS LOGIC yahan rehti hai (rules/decisions).
// KAISE KAR RAHA HAI: Controller sirf HTTP sambhalta hai, repository sirf SQL. Beech ka
// "kya allowed hai, kya nahi" wala dimaag yahan hai. Jaise: "Sold property edit nahi ho
// sakti" — ye rule yahan enforce hota hai, status code ke saath ApiError throw karke.

const PropertyRepository = require('../repositories/property.repository');
const AiEstimator = require('./aiEstimator.service');
const ApiError = require('../utils/ApiError');

const PropertyService = {
  async list() {
    return PropertyRepository.findAll();
  },

  async getById(id) {
    const property = await PropertyRepository.findById(id);
    if (!property) throw ApiError.notFound('Property not found');
    const amenities = await PropertyRepository.findAmenities(id);
    return { ...property, amenities };
  },

  async create(data) {
    // AI_Est_Price ab pluggable estimator se aata hai (Gemini ya heuristic fallback).
    const { value: AI_Est_Price } = await AiEstimator.estimate(data);
    const id = await PropertyRepository.create({
      ...data,
      Status: data.Status || 'Available',
      AI_Est_Price,
    });
    return { Property_ID: id, AI_Est_Price };
  },

  // KYA KAR RAHA HAI: Existing property ka AI estimate dobara nikaal ke DB me save karta hai.
  // KAISE: Pehle property nikaalo (404 agar nahi mili), estimator chalao, AI_Est_Price update
  // karo. Response me {source, rationale} bhi deta hai taaki UI bata sake estimate kahan se aaya.
  async reestimate(id) {
    const property = await PropertyRepository.findById(id);
    if (!property) throw ApiError.notFound('Property not found');
    const result = await AiEstimator.estimate(property);
    await PropertyRepository.updateAiPrice(id, result.value);
    return { Property_ID: Number(id), AI_Est_Price: result.value, source: result.source, rationale: result.rationale };
  },

  async update(id, data) {
    // RULE: Sold property permanently locked hai — edit nahi ho sakti.
    const currentStatus = await PropertyRepository.getStatus(id);
    if (currentStatus === null) throw ApiError.notFound('Property not found');
    if (currentStatus === 'Sold') {
      throw ApiError.forbidden('This property has been sold and cannot be modified.');
    }
    await PropertyRepository.update(id, data);
    return { message: 'Updated' };
  },

  async remove(id) {
    await PropertyRepository.remove(id);
    return { message: 'Deleted' };
  },
};

module.exports = PropertyService;
