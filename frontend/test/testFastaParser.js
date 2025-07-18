import { parseFasta } from '../src/utils/FastaParser.js'

const sample = `>tr|A0A097PBJ0|A0A097PBJ0_CYAPA Cytochrome b6 OS=Cyanophora paradoxa OX=2762 GN=petB PE=3 SV=1
MSKVYDWFQERLEIQAIADDITSKYVPPHVNIFYCLGGITLTCFLVQVATGFAMTFYYRP
TVTEAFASVQYIMTDVNFGWLIRSTHRWSASMMVLMMILHVFRVYLTGGFKKPRELTWVV
GVILAVITVSFGVTGYSLPWDQVGYWAVKIVTGVPEAIPVIGSNVVELLRGSVSVGQSTL
TRFYSLHTFVLPLLSAVFMLVHFLLIRKQGISGPL
>tr|E1CBV0|E1CBV0_CYAPA Cytochrome c oxidase subunit 1 (Fragment) OS=Cyanophora paradoxa OX=2762 GN=cox1 PE=3 SV=1
IFGAXSGLLGTAFSFLIRLELANPGNQVLAGNHQLYNVIVTAHAFIMVFFMVMPVLIGGF
GNWFVPIMIGAPDMAFPRLNNISFWVLPPSLLLLTVSALVETGAGTGWTVYPPLSAIQGH
SSASIDLAIFSLHLSGAGSILGTVNFISTIFNMRASGLKMHQLPLFVWAVLITAFLLLIS
LPVFAGSLTMLLTDRNFNTTFYDPAGGGDPILYQHLFWFFGHPEVYILIIPGFGIISHVI
STFSSKPVFGYLGMVYAMLSIGILGFIVWAHHMYTVGLDVDTRAYFTAATMIIAVPTGIK
IFSWIATMWGGSIVLYTPMLFAVGFILLFTIGGLTGIVLSNSGLDIAFHDTYYVVGHFHY
VLSMGAVFAMVCGFYYWIGKIAP`

const result = parseFasta(sample)
console.log(JSON.stringify(result, null, 2))
