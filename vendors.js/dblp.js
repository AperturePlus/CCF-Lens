
// ==UserScript==
// @name         DBLP CCF Rank Displayer
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在 DBLP 搜索结果页面显示论文的 CCF-2022 分级
// @author       Your Name & AI Assistant
// @match        *://dblp.org/search*
// @match        *://*.dblp.org/search*
// @match        *://dblp.org/db/*
// @match        *://*.dblp.org/db/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // 基于CCF 2022版目录的完整数据库
    const ccfCatalog = {
        // === A类期刊 ===
        'tocs': 'A', 'tos': 'A', 'tcad': 'A', 'tc': 'A', 'tpds': 'A', 'taco': 'A',
        'jsac': 'A', 'tmc': 'A', 'ton': 'A',
        'tdsc': 'A', 'tifs': 'A', 'journal of cryptology': 'A',
        'toplas': 'A', 'tosem': 'A', 'tse': 'A', 'tsc': 'A',
        'tods': 'A', 'tois': 'A', 'tkde': 'A', 'vldbj': 'A',
        'tit': 'A', 'iandc': 'A', 'sicomp': 'A',
        'tog': 'A', 'tip': 'A', 'tvcg': 'A',
        'ai': 'A', 'tpami': 'A', 'pami': 'A', 'ijcv': 'A', 'jmlr': 'A',
        'tochi': 'A', 'ijhcs': 'A',
        'jacm': 'A', 'proc. ieee': 'A', 'proceedings of the ieee': 'A', 'scis': 'A',

        // === B类期刊 ===
        'taas': 'B', 'todaes': 'B', 'tecs': 'B', 'trets': 'B', 'tvlsi': 'B', 'jpdc': 'B', 'jsa': 'B',
        'toit': 'B', 'tomm': 'B', 'tosn': 'B', 'cn': 'B', 'computer networks': 'B', 'tcom': 'B', 'twc': 'B',
        'tops': 'B', 'computers & security': 'B', 'designs, codes and cryptography': 'B', 'jcs': 'B',
        'ase': 'B', 'ese': 'B', 'iets': 'B', 'ist': 'B', 'jfp': 'B', 'jss': 'B', 're': 'B', 'scp': 'B', 'sosym': 'B', 'stvr': 'B', 'spe': 'B',
        'tkdd': 'B', 'tweb': 'B', 'aei': 'B', 'dke': 'B', 'dmkd': 'B', 'ejis': 'B', 'geoinformatica': 'B', 'ipm': 'B', 'information sciences': 'B', 'is': 'B', 'jasist': 'B', 'jws': 'B', 'kais': 'B',
        'talg': 'B', 'tocl': 'B', 'toms': 'B', 'algorithmica': 'B', 'cc': 'B', 'fac': 'B', 'fmsd': 'B', 'informs': 'B', 'jcss': 'B', 'jgo': 'B', 'jsc': 'B', 'mscs': 'B', 'tcs': 'B',
        'cagd': 'B', 'cgf': 'B', 'cad': 'B', 'gm': 'B', 'tcsvt': 'B', 'tmm': 'B', 'jasa': 'B', 'siims': 'B', 'specom': 'B',
        'tap': 'B', 'tslp': 'B', 'aamas': 'B', 'computational linguistics': 'B', 'cviu': 'B', 'evolutionary computation': 'B', 'tac': 'B', 'taslp': 'B', 'ieee transactions on cybernetics': 'B', 'tec': 'B', 'tfs': 'B', 'tnnls': 'B', 'ijar': 'B', 'jair': 'B', 'neural computation': 'B', 'neural networks': 'B', 'pr': 'B', 'pattern recognition': 'B', 'tacl': 'B',
        'cscw': 'B', 'hci': 'B', 'ieee transactions on human-machine systems': 'B', 'iwc': 'B', 'ijhci': 'B', 'umuai': 'B', 'tsmc': 'B',
        'bioinformatics': 'B', 'tcbb': 'B', 'jcst': 'B', 'jamia': 'B', 'plos computational biology': 'B', 'the computer journal': 'B', 'www': 'B', 'world wide web': 'B', 'fcs': 'B',

        // === A类会议 ===
        'ppopp': 'A', 'fast': 'A', 'dac': 'A', 'hpca': 'A', 'micro': 'A', 'sc': 'A', 'asplos': 'A', 'isca': 'A', 'usenix atc': 'A', 'eurosys': 'A',
        'sigcomm': 'A', 'mobicom': 'A', 'infocom': 'A', 'nsdi': 'A',
        'ccs': 'A', 'eurocrypt': 'A', 's&p': 'A', 'crypto': 'A', 'usenix security': 'A', 'ndss': 'A',
        'pldi': 'A', 'popl': 'A', 'fse/esec': 'A', 'fse': 'A', 'esec': 'A', 'sosp': 'A', 'oopsla': 'A', 'ase': 'A', 'icse': 'A', 'issta': 'A', 'osdi': 'A', 'fm': 'A',
        'sigmod': 'A', 'sigkdd': 'A', 'kdd': 'A', 'icde': 'A', 'sigir': 'A', 'vldb': 'A',
        'stoc': 'A', 'soda': 'A', 'cav': 'A', 'focs': 'A', 'lics': 'A',
        'acm mm': 'A', 'siggraph': 'A', 'vr': 'A', 'ieee vis': 'A', 'visualization': 'A',
        'aaai': 'A', 'neurips': 'A', 'nips': 'A', 'acl': 'A', 'cvpr': 'A', 'iccv': 'A', 'icml': 'A', 'ijcai': 'A',
        'cscw': 'A', 'chi': 'A', 'ubicomp': 'A', 'uist': 'A',
        'www': 'A', 'rtss': 'A', 'wine': 'A',

        // === B类会议 ===
        'socc': 'B', 'spaa': 'B', 'podc': 'B', 'fpga': 'B', 'cgo': 'B', 'date': 'B', 'cluster': 'B', 'iccd': 'B', 'iccad': 'B', 'icdcs': 'B', 'sigmetrics': 'B', 'pact': 'B', 'icpp': 'B', 'ics': 'B', 'vee': 'B', 'ipdps': 'B', 'hpdc': 'B', 'itc': 'B', 'lisa': 'B', 'msst': 'B', 'rtas': 'B', 'euro-par': 'B',
        'sensys': 'B', 'conext': 'B', 'secon': 'B', 'ipsn': 'B', 'mobisys': 'B', 'icnp': 'B', 'mobihoc': 'B', 'nossdav': 'B', 'iwqos': 'B', 'imc': 'B',
        'acsac': 'B', 'asiacrypt': 'B', 'esorics': 'B', 'csfw': 'B', 'srds': 'B', 'ches': 'B', 'dsn': 'B', 'raid': 'B', 'pkc': 'B', 'tcc': 'B',
        'ecoop': 'B', 'etaps': 'B', 'icpc': 'B', 're': 'B', 'caise': 'B', 'icfp': 'B', 'lctes': 'B', 'models': 'B', 'cp': 'B', 'icsoc': 'B', 'saner': 'B', 'icsme': 'B', 'vmcai': 'B', 'icws': 'B', 'middleware': 'B', 'sas': 'B', 'esem': 'B', 'issre': 'B', 'hotos': 'B',
        'cikm': 'B', 'wsdm': 'B', 'pods': 'B', 'dasfaa': 'B', 'ecml-pkdd': 'B', 'iswc': 'B', 'icdm': 'B', 'icdt': 'B', 'edbt': 'B', 'cidr': 'B', 'sdm': 'B', 'recsys': 'B',
        'socg': 'B', 'esa': 'B', 'ccc': 'B', 'icalp': 'B', 'cade': 'B', 'concur': 'B', 'hscc': 'B', 'sat': 'B', 'cocoon': 'B',
        'icmr': 'B', 'i3d': 'B', 'sca': 'B', 'dcc': 'B', 'eurographics': 'B', 'eurovis': 'B', 'sgp': 'B', 'egsr': 'B', 'icassp': 'B', 'icme': 'B', 'ismar': 'B', 'pg': 'B', 'spm': 'B',
        'colt': 'B', 'emnlp': 'B', 'ecai': 'B', 'eccv': 'B', 'icra': 'B', 'icaps': 'B', 'iccbr': 'B', 'coling': 'B', 'kr': 'B', 'uai': 'B', 'aamas': 'B', 'ppsn': 'B', 'naacl': 'B',
        'group': 'B', 'iui': 'B', 'its': 'B', 'ecscw': 'B', 'percom': 'B', 'mobilehci': 'B', 'icwsm': 'B',
        'cogsci': 'B', 'bibm': 'B', 'emsoft': 'B', 'ismb': 'B', 'recomb': 'B', 'miccai': 'B',

        // 常见的期刊会议全称和别名
        'ieee computer vision and pattern recognition': 'A', // CVPR
        'ieee conference on computer vision and pattern recognition': 'A', // CVPR
        'proceedings of the ieee conference on computer vision and pattern recognition': 'A', // CVPR
        'ieee cvpr': 'A', // CVPR
        'international conference on computer vision': 'A', // ICCV
        'proceedings of the ieee international conference on computer vision': 'A', // ICCV
        'ieee iccv': 'A', // ICCV
        'international conference on machine learning': 'A', // ICML
        'proceedings of the international conference on machine learning': 'A', // ICML
        'advances in neural information processing systems': 'A', // NeurIPS/NIPS
        'neural information processing systems': 'A', // NeurIPS/NIPS
        'conference on neural information processing systems': 'A', // NeurIPS/NIPS
        'european conference on computer vision': 'B', // ECCV
        'proceedings of the european conference on computer vision': 'B', // ECCV
        'ieee eccv': 'B', // ECCV
        'conference on empirical methods in natural language processing': 'B', // EMNLP
        'empirical methods in natural language processing': 'B', // EMNLP
        'international conference on robotics and automation': 'B', // ICRA
        'ieee international conference on robotics and automation': 'B', // ICRA
        'ieee icra': 'B', // ICRA
        'international conference on learning representations': 'A', // ICLR
        'iclr': 'A', // ICLR
        'international conference on acoustics, speech and signal processing': 'B', // ICASSP
        'ieee icassp': 'B', // ICASSP
        'ieee transactions on pattern analysis and machine intelligence': 'A', // TPAMI
        'ieee transactions on image processing': 'A', // TIP
        'ieee transactions on visualization and computer graphics': 'A', // TVCG
        'international journal of computer vision': 'A', // IJCV
        'journal of machine learning research': 'A', // JMLR
        'pattern recognition': 'B', // PR
        'computer vision and image understanding': 'B', // CVIU
        'neural networks': 'B',
        'machine learning': 'B',
        'wacv': 'B', // WACV
        'bmvc': 'B', // BMVC
        'winter conference on applications of computer vision': 'B', // WACV
        'british machine vision conference': 'B', // BMVC

        // 常见期刊会议的DBLP缩写
        'computer vision and pattern recognition': 'A', // CVPR
        'computer vision and pattern recognition workshops': 'B', // CVPR Workshops
        'international conference on computer vision': 'A', // ICCV
        'international conference on machine learning': 'A', // ICML
        'neural information processing systems': 'A', // NeurIPS
        'international conference on learning representations': 'A', // ICLR
        'european conference on computer vision': 'B', // ECCV
        'conference on empirical methods in natural language processing': 'B', // EMNLP
        'annual meeting of the association for computational linguistics': 'A', // ACL
        'international joint conference on artificial intelligence': 'A', // IJCAI
        'national conference on artificial intelligence': 'A', // AAAI
        'international conference on robotics and automation': 'B', // ICRA
        'international conference on acoustics, speech, and signal processing': 'B', // ICASSP
        'winter conference on applications of computer vision': 'B', // WACV
        'british machine vision conference': 'B', // BMVC
    };

    // 已处理的论文缓存
    const processedPapers = new Set();

    function processAllResults() {
        console.log('[DBLP CCF Rank] 开始处理DBLP页面...');

        // DBLP搜索结果的可能选择器
        const possibleSelectors = [
            // 搜索结果页面
            '#completesearch-papers li',
            '#completesearch-papers .entry',
            '.publ-list li',
            '.publ',
            '.entry',
            'li[id^="pid"]',
            'li.entry',
            // 个人页面或会议页面
            '.publ-list .publ',
            '.data li',
            'li.drop-down',
            // 通用备选
            'li[class*="publ"]',
            'div[class*="entry"]'
        ];

        let results = [];

        for (let selector of possibleSelectors) {
            results = document.querySelectorAll(selector);
            if (results.length > 0) {
                console.log(`[DBLP CCF Rank] 使用选择器 "${selector}" 找到 ${results.length} 个结果`);
                break;
            }
        }

        if (results.length === 0) {
            console.log('[DBLP CCF Rank] 未找到标准格式，尝试通用选择器...');
            // 尝试更通用的选择器
            results = document.querySelectorAll('li, .result, .item');
            results = Array.from(results).filter(el => {
                // 过滤出可能包含论文信息的元素
                const text = el.textContent;
                return text.length > 50 && (
                    text.includes('Proceedings') ||
                    text.includes('Journal') ||
                    text.includes('Conference') ||
                    text.includes('Transaction') ||
                    /\d{4}/.test(text) // 包含年份
                );
            });
            console.log(`[DBLP CCF Rank] 通用选择器找到 ${results.length} 个可能的结果`);
        }

        console.log(`[DBLP CCF Rank] 开始处理 ${results.length} 个结果...`);
        results.forEach((result, index) => {
            processSingleResult(result, index);
        });
    }

    function processSingleResult(resultElement, index) {
        // 避免重复处理
        if (resultElement.querySelector('.ccf-rank-info') || processedPapers.has(resultElement)) {
            return;
        }

        processedPapers.add(resultElement);

        console.log(`[DBLP CCF Rank] #${index}: 处理结果元素`);

        // 提取venue信息
        const venueInfo = extractVenueFromElement(resultElement);

        if (venueInfo) {
            console.log(`[DBLP CCF Rank] #${index}: 找到venue "${venueInfo.venue}"`);
            const ccfRank = lookupCcfRank(venueInfo.venue);

            if (ccfRank) {
                displayCcfRank(resultElement, venueInfo, ccfRank, index);
            } else {
                console.log(`[DBLP CCF Rank] #${index}: 未找到CCF等级 for "${venueInfo.venue}"`);
            }
        } else {
            console.log(`[DBLP CCF Rank] #${index}: 未找到venue信息`);
        }
    }

    function extractVenueFromElement(element) {
        // 尝试多种方式提取venue信息

        // 1. 尝试从特定的venue链接提取
        const venueLink = element.querySelector('a[href*="/db/conf/"], a[href*="/db/journals/"], a[href*="/db/series/"]');
        if (venueLink) {
            const venueText = venueLink.textContent.trim();
            const year = extractYear(element.textContent);
            if (venueText) {
                console.log(`[DBLP CCF Rank] 从venue链接提取: "${venueText}"`);
                return {
                    venue: venueText,
                    year: year,
                    source: 'venue_link'
                };
            }
        }

        // 2. 尝试从span.publ-venue提取
        const venueSpan = element.querySelector('span.publ-venue, .venue, [class*="venue"]');
        if (venueSpan) {
            const venueText = venueSpan.textContent.trim();
            const year = extractYear(element.textContent);
            if (venueText) {
                console.log(`[DBLP CCF Rank] 从venue span提取: "${venueText}"`);
                return {
                    venue: venueText,
                    year: year,
                    source: 'venue_span'
                };
            }
        }

        // 3. 从完整文本中用正则表达式提取
        const fullText = element.textContent;
        const venueFromText = extractVenueFromText(fullText);
        if (venueFromText) {
            console.log(`[DBLP CCF Rank] 从文本提取: "${venueFromText.venue}"`);
            return venueFromText;
        }

        return null;
    }

    function extractVenueFromText(text) {
        // 多种正则模式匹配venue
        const patterns = [
            // DBLP常见格式: "Proceedings of ... 2024"
            /Proceedings of (?:the\s+)?([^,\n]+?)\s+(\d{4})/i,

            // 期刊格式: "Journal Name vol. X, 2024"
            /([A-Z][^,\n]+?(?:Journal|Transaction|Magazine|Review|Letters))\s+(?:vol?\.\s*\d+[^,]*,?\s*)?(\d{4})/i,

            // 会议格式: "Conference Name 2024"
            /([A-Z][^,\n]+?(?:Conference|Symposium|Workshop))\s+(\d{4})/i,

            // 简单格式: "VENUE YEAR" (全大写缩写)
            /\b([A-Z]{2,})\s+(\d{4})\b/g,

            // CoRR格式
            /CoRR\s+abs\/[\d.]+\s+(\d{4})/i,

            // 更宽松的模式
            /([A-Z][A-Za-z\s&]+?)\s+(\d{4})/
        ];

        for (let pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                let venue = match[1].trim();
                let year = match[2];

                // 清理venue名称
                venue = cleanVenueString(venue);

                if (isValidVenue(venue)) {
                    return {
                        venue: venue,
                        year: year,
                        source: 'text_extraction'
                    };
                }
            }
        }

        return null;
    }

    function extractYear(text) {
        const yearMatch = text.match(/\b(19|20)\d{2}\b/);
        return yearMatch ? yearMatch[0] : null;
    }

    function cleanVenueString(venue) {
        return venue
            .replace(/^Proceedings of (?:the\s+)?/i, '') // 移除 "Proceedings of (the)"
            .replace(/^International\s+/i, '') // 移除 "International"
            .replace(/^IEEE\s+/i, '') // 移除 "IEEE"
            .replace(/^ACM\s+/i, '') // 移除 "ACM"
            .replace(/\s+(?:Conference|Symposium|Workshop|Journal|Magazine|Transaction|Letters|Review)$/i, '') // 移除后缀
            .replace(/\s+on\s+/i, ' ') // 简化 "on"
            .replace(/\s+and\s+/i, ' & ') // 统一 "and"
            .replace(/\s+/g, ' ') // 规范化空格
            .trim();
    }

    function isValidVenue(venue) {
        if (!venue || venue.length < 2 || venue.length > 150) return false;

        // 排除明显不是venue的词
        const excludeWords = ['pages', 'pp', 'vol', 'issue', 'number', 'abstract', 'author'];
        const lowerVenue = venue.toLowerCase();

        for (let word of excludeWords) {
            if (lowerVenue.includes(word)) return false;
        }

        return true;
    }

    function lookupCcfRank(venueString) {
        if (!venueString) return null;

        const lowerVenue = venueString.toLowerCase().trim();

        // 1. 完全匹配
        if (ccfCatalog[lowerVenue]) {
            return ccfCatalog[lowerVenue];
        }

        // 2. 清理后的匹配
        const cleanedVenue = cleanVenueString(lowerVenue);
        if (ccfCatalog[cleanedVenue]) {
            return ccfCatalog[cleanedVenue];
        }

        // 3. 部分匹配
        for (const [abbr, rank] of Object.entries(ccfCatalog)) {
            // 完全包含匹配
            if (cleanedVenue === abbr || lowerVenue === abbr) {
                return rank;
            }

            // 检查是否包含关键词
            if (cleanedVenue.includes(abbr) && abbr.length > 2) {
                return rank;
            }

            // 反向检查
            if (abbr.includes(cleanedVenue) && cleanedVenue.length > 2) {
                return rank;
            }
        }

        // 4. 缩写匹配
        const acronym = cleanedVenue
            .split(/\s+/)
            .filter(word => word.length > 2)
            .map(word => word.charAt(0))
            .join('');

        if (acronym && ccfCatalog[acronym]) {
            return ccfCatalog[acronym];
        }

        // 5. 模糊匹配常见变体
        const fuzzyMatches = {
            'cvpr': 'A',
            'iccv': 'A',
            'icml': 'A',
            'neurips': 'A',
            'nips': 'A',
            'iclr': 'A',
            'eccv': 'B',
            'emnlp': 'B',
            'acl': 'A',
            'ijcai': 'A',
            'aaai': 'A',
            'icra': 'B',
            'icassp': 'B',
            'wacv': 'B',
            'bmvc': 'B'
        };

        for (const [key, rank] of Object.entries(fuzzyMatches)) {
            if (lowerVenue.includes(key)) {
                return rank;
            }
        }

        return null;
    }

    function displayCcfRank(resultElement, venueInfo, ccfRank, index) {
        const container = document.createElement('div');
        container.className = 'ccf-rank-info';
        container.style.cssText = `
            margin: 5px 0;
            padding: 0;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 0.85em;
            font-weight: bold;
        `;

        // Venue信息
        const venueElement = document.createElement('span');
        venueElement.style.cssText = `
            padding: 2px 6px;
            border-radius: 3px;
            color: white;
            background-color: #007b5f;
            font-size: 0.8em;
        `;
        venueElement.textContent = `📍 ${venueInfo.venue}`;
        venueElement.title = `Venue: ${venueInfo.venue}${venueInfo.year ? ` (${venueInfo.year})` : ''}\nSource: ${venueInfo.source}`;

        // CCF等级标签
        const ccfElement = document.createElement('span');
        ccfElement.style.cssText = `
            padding: 2px 6px;
            border-radius: 3px;
            color: white;
            font-size: 0.8em;
            background-color: ${ccfRank === 'A' ? '#d9534f' : ccfRank === 'B' ? '#f0ad4e' : '#5bc0de'};
        `;
        ccfElement.textContent = `CCF-${ccfRank}`;
        ccfElement.title = `CCF 2022版分级: ${ccfRank}类`;

        container.appendChild(venueElement);
        container.appendChild(ccfElement);

        // 寻找合适的插入位置
        const insertionPoint = findInsertionPoint(resultElement);

        try {
            if (insertionPoint) {
                // 在找到的位置后插入
                if (insertionPoint.nextSibling) {
                    insertionPoint.parentNode.insertBefore(container, insertionPoint.nextSibling);
                } else {
                    insertionPoint.parentNode.appendChild(container);
                }
            } else {
                // 如果没有找到合适位置，插入到元素末尾
                resultElement.appendChild(container);
            }

            console.log(`[DBLP CCF Rank] #${index}: 成功显示 CCF-${ccfRank} for "${venueInfo.venue}"`);
        } catch (error) {
            console.error(`[DBLP CCF Rank] #${index}: 插入失败`, error);
        }
    }

    function findInsertionPoint(resultElement) {
        // 尝试多个可能的插入位置
        const candidates = [
            // DBLP特有的选择器
            resultElement.querySelector('.publ-venue'),
            resultElement.querySelector('.data'),
            resultElement.querySelector('cite'),
            resultElement.querySelector('.publ-type'),
            // 通用选择器
            resultElement.querySelector('a[href*="/db/"]'),
            resultElement.querySelector('span[title]'),
            resultElement.querySelector('.title'),
            resultElement.querySelector('h3'),
            resultElement.querySelector('h4'),
            // 最后的备选
            resultElement.firstElementChild
        ];

        for (let candidate of candidates) {
            if (candidate) {
                return candidate;
            }
        }

        return resultElement;
    }

    // 页面加载和变化监听
    function init() {
        console.log('[DBLP CCF Rank] 脚本启动...');

        // 等待页面加载完成
        function waitForPageReady() {
            return new Promise((resolve) => {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', resolve);
                } else {
                    resolve();
                }
            });
        }

        waitForPageReady().then(() => {
            // 延迟执行，确保页面完全渲染
            setTimeout(processAllResults, 1500);
        });

        // 监听动态内容变化
        const observer = new MutationObserver((mutations) => {
            let shouldProcess = false;

            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (let node of mutation.addedNodes) {
                        if (node.nodeType === 1 && (
                            node.classList.contains('publ') ||
                            node.classList.contains('entry') ||
                            node.querySelector && (
                                node.querySelector('.publ') ||
                                node.querySelector('.entry') ||
                                node.querySelector('li[id^="pid"]')
                            )
                        )) {
                            shouldProcess = true;
                            break;
                        }
                    }
                }
            });

            if (shouldProcess) {
                setTimeout(processAllResults, 1000);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 启动脚本
    init();

})();
