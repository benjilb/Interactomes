import { Protein, Crosslink } from '../models';

export const getProteins = async (req, res) => {
    const data = await Protein.findAll();
    res.json(data);
};

export const getCrosslinks = async (req, res) => {
    const data = await Crosslink.findAll();
    res.json(data);
};