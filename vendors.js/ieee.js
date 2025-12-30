
// ==UserScript==
// @name         IEEE Xplore CCF Rank Displayer (Improved)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  在 IEEE Xplore 搜索结果页面显示论文的 CCF-2022 分级（基于官方目录改进）
// @author       Your Name & AI Assistant
// @match        *://ieeexplore.ieee.org/search/*
// @match        *://ieeexplore.ieee.org/author/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // 基于CCF 2022版目录的完整数据库
    const ccfCatalog = {
        // === A类期刊 ===
        // 计算机体系结构/并行与分布计算/存储系统
        'tocs': 'A', 'tos': 'A', 'tcad': 'A', 'tc': 'A', 'tpds': 'A', 'taco': 'A',

        // 计算机网络
        'jsac': 'A', 'tmc': 'A', 'ton': 'A',

        // 网络与信息安全
        'tdsc': 'A', 'tifs': 'A', 'journal of cryptology': 'A',

        // 软件工程/系统软件/程序设计语言
        'toplas': 'A', 'tosem': 'A', 'tse': 'A', 'tsc': 'A',

        // 数据库/数据挖掘/内容检索
        'tods': 'A', 'tois': 'A', 'tkde': 'A', 'vldbj': 'A',

        // 计算机科学理论
        'tit': 'A', 'iandc': 'A', 'sicomp': 'A',

        // 计算机图形学与多媒体
        'tog': 'A', 'tip': 'A', 'tvcg': 'A',

        // 人工智能
        'ai': 'A', 'tpami': 'A', 'pami': 'A', 'ijcv': 'A', 'jmlr': 'A',

        // 人机交互与普适计算
        'tochi': 'A', 'ijhcs': 'A',

        // 交叉/综合/新兴
        'jacm': 'A', 'proc. ieee': 'A', 'proceedings of the ieee': 'A', 'scis': 'A',

        // === B类期刊 ===
        // 计算机体系结构/并行与分布计算/存储系统
        'taas': 'B', 'todaes': 'B', 'tecs': 'B', 'trets': 'B', 'tvlsi': 'B', 'jpdc': 'B', 'jsa': 'B', 'parallel computing': 'B', 'performance evaluation: an international journal': 'B',

        // 计算机网络
        'toit': 'B', 'tomm': 'B', 'tosn': 'B', 'cn': 'B', 'computer networks': 'B', 'tcom': 'B', 'twc': 'B',

        // 网络与信息安全
        'tops': 'B', 'computers & security': 'B', 'designs, codes and cryptography': 'B', 'jcs': 'B',

        // 软件工程/系统软件/程序设计语言
        'ase': 'B', 'ese': 'B', 'iets': 'B', 'ist': 'B', 'jfp': 'B', 'journal of software: evolution and process': 'B', 'jss': 'B', 're': 'B', 'scp': 'B', 'sosym': 'B', 'stvr': 'B', 'spe': 'B',

        // 数据库/数据挖掘/内容检索
        'tkdd': 'B', 'tweb': 'B', 'aei': 'B', 'dke': 'B', 'dmkd': 'B', 'ejis': 'B', 'geoinformatica': 'B', 'ipm': 'B', 'information sciences': 'B', 'is': 'B', 'jasist': 'B', 'jws': 'B', 'kais': 'B',

        // 计算机科学理论
        'talg': 'B', 'tocl': 'B', 'toms': 'B', 'algorithmica': 'B', 'cc': 'B', 'fac': 'B', 'fmsd': 'B', 'informs': 'B', 'jcss': 'B', 'jgo': 'B', 'jsc': 'B', 'mscs': 'B', 'tcs': 'B',

        // 计算机图形学与多媒体
        'cagd': 'B', 'cgf': 'B', 'cad': 'B', 'gm': 'B', 'tcsvt': 'B', 'tmm': 'B', 'jasa': 'B', 'siims': 'B', 'specom': 'B',

        // 人工智能
        'tap': 'B', 'tslp': 'B', 'aamas': 'B', 'computational linguistics': 'B', 'cviu': 'B', 'evolutionary computation': 'B', 'tac': 'B', 'taslp': 'B', 'ieee transactions on cybernetics': 'B', 'tec': 'B', 'tfs': 'B', 'tnnls': 'B', 'ijar': 'B', 'jair': 'B', 'journal of automated reasoning': 'B', 'jslhr': 'B', 'machine learning': 'B', 'neural computation': 'B', 'neural networks': 'B', 'pr': 'B', 'pattern recognition': 'B', 'tacl': 'B',

        // 人机交互与普适计算
        'cscw': 'B', 'hci': 'B', 'ieee transactions on human-machine systems': 'B', 'iwc': 'B', 'ijhci': 'B', 'umuai': 'B', 'tsmc': 'B',

        // 交叉/综合/新兴
        'bioinformatics': 'B', 'briefings in bioinformatics': 'B', 'cognition': 'B', 'tasae': 'B', 'tgars': 'B', 'tits': 'B', 'tmi': 'B', 'tr': 'B', 'tcbb': 'B', 'jcst': 'B', 'jamia': 'B', 'plos computational biology': 'B', 'the computer journal': 'B', 'www': 'B', 'world wide web': 'B', 'fcs': 'B',

        // === A类会议 ===
        // 计算机体系结构/并行与分布计算/存储系统
        'ppopp': 'A', 'fast': 'A', 'dac': 'A', 'hpca': 'A', 'micro': 'A', 'sc': 'A', 'asplos': 'A', 'isca': 'A', 'usenix atc': 'A', 'eurosys': 'A',

        // 计算机网络
        'sigcomm': 'A', 'mobicom': 'A', 'infocom': 'A', 'nsdi': 'A',

        // 网络与信息安全
        'ccs': 'A', 'eurocrypt': 'A', 's&p': 'A', 'crypto': 'A', 'usenix security': 'A', 'ndss': 'A',

        // 软件工程/系统软件/程序设计语言
        'pldi': 'A', 'popl': 'A', 'fse/esec': 'A', 'fse': 'A', 'esec': 'A', 'sosp': 'A', 'oopsla': 'A', 'ase': 'A', 'icse': 'A', 'issta': 'A', 'osdi': 'A', 'fm': 'A',

        // 数据库/数据挖掘/内容检索
        'sigmod': 'A', 'sigkdd': 'A', 'kdd': 'A', 'icde': 'A', 'sigir': 'A', 'vldb': 'A',

        // 计算机科学理论
        'stoc': 'A', 'soda': 'A', 'cav': 'A', 'focs': 'A', 'lics': 'A',

        // 计算机图形学与多媒体
        'acm mm': 'A', 'siggraph': 'A', 'vr': 'A', 'ieee vis': 'A', 'visualization': 'A',

        // 人工智能
        'aaai': 'A', 'neurips': 'A', 'nips': 'A', 'acl': 'A', 'cvpr': 'A', 'iccv': 'A', 'icml': 'A', 'ijcai': 'A',

        // 人机交互与普适计算
        'cscw': 'A', 'chi': 'A', 'ubicomp': 'A', 'uist': 'A',

        // 交叉/综合/新兴
        'www': 'A', 'rtss': 'A', 'wine': 'A',

        // === B类会议 ===
        // 计算机体系结构/并行与分布计算/存储系统
        'socc': 'B', 'spaa': 'B', 'podc': 'B', 'fpga': 'B', 'cgo': 'B', 'date': 'B', 'hot chips': 'B', 'cluster': 'B', 'iccd': 'B', 'iccad': 'B', 'icdcs': 'B', 'codes+isss': 'B', 'hipeac': 'B', 'sigmetrics': 'B', 'pact': 'B', 'icpp': 'B', 'ics': 'B', 'vee': 'B', 'ipdps': 'B', 'performance': 'B', 'hpdc': 'B', 'itc': 'B', 'lisa': 'B', 'msst': 'B', 'rtas': 'B', 'euro-par': 'B',

        // 计算机网络
        'sensys': 'B', 'conext': 'B', 'secon': 'B', 'ipsn': 'B', 'mobisys': 'B', 'icnp': 'B', 'mobihoc': 'B', 'nossdav': 'B', 'iwqos': 'B', 'imc': 'B',

        // 网络与信息安全
        'acsac': 'B', 'asiacrypt': 'B', 'esorics': 'B', 'fse': 'B', 'csfw': 'B', 'srds': 'B', 'ches': 'B', 'dsn': 'B', 'raid': 'B', 'pkc': 'B', 'tcc': 'B',

        // 软件工程/系统软件/程序设计语言
        'ecoop': 'B', 'etaps': 'B', 'icpc': 'B', 're': 'B', 'caise': 'B', 'icfp': 'B', 'lctes': 'B', 'models': 'B', 'cp': 'B', 'icsoc': 'B', 'saner': 'B', 'icsme': 'B', 'vmcai': 'B', 'icws': 'B', 'middleware': 'B', 'sas': 'B', 'esem': 'B', 'issre': 'B', 'hotos': 'B',

        // 数据库/数据挖掘/内容检索
        'cikm': 'B', 'wsdm': 'B', 'pods': 'B', 'dasfaa': 'B', 'ecml-pkdd': 'B', 'iswc': 'B', 'icdm': 'B', 'icdt': 'B', 'edbt': 'B', 'cidr': 'B', 'sdm': 'B', 'recsys': 'B',

        // 计算机科学理论
        'socg': 'B', 'esa': 'B', 'ccc': 'B', 'icalp': 'B', 'cade': 'B', 'concur': 'B', 'hscc': 'B', 'sat': 'B', 'cocoon': 'B',

        // 计算机图形学与多媒体
        'icmr': 'B', 'i3d': 'B', 'sca': 'B', 'dcc': 'B', 'eurographics': 'B', 'eurovis': 'B', 'sgp': 'B', 'egsr': 'B', 'icassp': 'B', 'icme': 'B', 'ismar': 'B', 'pg': 'B', 'spm': 'B',

        // 人工智能
        'colt': 'B', 'emnlp': 'B', 'ecai': 'B', 'eccv': 'B', 'icra': 'B', 'icaps': 'B', 'iccbr': 'B', 'coling': 'B', 'kr': 'B', 'uai': 'B', 'aamas': 'B', 'ppsn': 'B', 'naacl': 'B',

        // 人机交互与普适计算
        'group': 'B', 'iui': 'B', 'its': 'B', 'ecscw': 'B', 'percom': 'B', 'mobilehci': 'B', 'icwsm': 'B',

        // 交叉/综合/新兴
        'cogsci': 'B', 'bibm': 'B', 'emsoft': 'B', 'ismb': 'B', 'recomb': 'B', 'miccai': 'B',

        // 额外的IEEE常见缩写和全称映射
        'ieee transactions on computers': 'A',
        'ieee transactions on parallel and distributed systems': 'A',
        'ieee transactions on computer-aided design of integrated circuits and systems': 'A',
        'ieee transactions on mobile computing': 'A',
        'ieee transactions on dependable and secure computing': 'A',
        'ieee transactions on information forensics and security': 'A',
        'ieee transactions on software engineering': 'A',
        'ieee transactions on services computing': 'A',
        'ieee transactions on knowledge and data engineering': 'A',
        'ieee transactions on information theory': 'A',
        'ieee transactions on image processing': 'A',
        'ieee transactions on visualization and computer graphics': 'A',
        'ieee transactions on pattern analysis and machine intelligence': 'A',
        'ieee journal on selected areas in communications': 'A',
        'ieee/acm transactions on networking': 'A',
        'proceedings of the ieee': 'A',

        // B类IEEE期刊
        'ieee transactions on very large scale integration (vlsi) systems': 'B',
        'ieee transactions on communications': 'B',
        'ieee transactions on wireless communications': 'B',
        'ieee transactions on circuits and systems for video technology': 'B',
        'ieee transactions on multimedia': 'B',
        'ieee transactions on evolutionary computation': 'B',
        'ieee transactions on fuzzy systems': 'B',
        'ieee transactions on neural networks and learning systems': 'B',
        'ieee transactions on affective computing': 'B',
        'ieee/acm transactions on audio, speech and language processing': 'B',
        'ieee transactions on cybernetics': 'B',
        'ieee transactions on automation science and engineering': 'B',
        'ieee transactions on geoscience and remote sensing': 'B',
        'ieee transactions on intelligent transportation systems': 'B',
        'ieee transactions on medical imaging': 'B',
        'ieee transactions on robotics': 'B',
        'ieee/acm transactions on computational biology and bioinformatics': 'B',

        // 会议的完整名称映射
        'ieee international conference on computer communications': 'A', // INFOCOM
        'ieee computer vision and pattern recognition conference': 'A', // CVPR
        'ieee/cvf computer vision and pattern recognition conference': 'A', // CVPR
        'international conference on computer vision': 'A', // ICCV
        'ieee virtual reality': 'A', // VR
        'ieee visualization conference': 'A', // IEEE VIS
        'ieee symposium on security and privacy': 'A', // S&P
        'ieee real-time systems symposium': 'A', // RTSS
        'ieee international symposium on high performance computer architecture': 'A', // HPCA
        'ieee/acm international symposium on microarchitecture': 'A', // MICRO
        'international symposium on computer architecture': 'A', // ISCA
        'international conference on architectural support for programming languages and operating systems': 'A', // ASPLOS

        // 更多IEEE B类会议
        'ieee international conference on data engineering': 'A', // ICDE
        'ieee international conference on software engineering': 'A', // ICSE
        'ieee international conference on acoustics, speech and signal processing': 'B', // ICASSP
        'ieee international conference on multimedia & expo': 'B', // ICME
        'ieee international conference on robotics and automation': 'B', // ICRA
        'ieee international conference on data mining': 'B', // ICDM
        'ieee international conference on cluster computing': 'B',
        'ieee international conference on distributed computing systems': 'B',
        'ieee international conference on computer design': 'B',
        'ieee international conference on computer-aided design': 'B',
        'ieee international conference on network protocols': 'B',
        'ieee international parallel & distributed processing symposium': 'B',
        'ieee international conference on sensing, communication, and networking': 'B',
        'ieee real-time and embedded technology and applications symposium': 'B',
    };

    // 改进的venue名称清理函数
    function cleanVenueString(venue) {
        let cleaned = venue
            .toLowerCase()
            .replace(/\d{4}$/, '') // 移除末尾年份
            .replace(/'\d{2}$/, '') // 移除 '23 这种年份
            .replace(/\(.*?\)/g, '') // 移除括号内容
            .replace(/\[.*?\]/g, '') // 移除方括号内容
            .replace(/,?\s*vol\.\s*\d+.*$/i, '') // 移除卷号信息
            .replace(/,?\s*pp\.\s*\d+.*$/i, '') // 移除页码信息
            .replace(/,?\s*no\.\s*\d+.*$/i, '') // 移除期号信息
            .replace(/,?\s*issue\s*\d+.*$/i, '') // 移除期号信息
            .replace(/^\d+\w*\s+/, '') // 移除开头的序号
            .replace(/\s+/g, ' ') // 规范化空格
            .trim();

        // 特殊处理一些常见的IEEE格式
        cleaned = cleaned
            .replace(/^ieee\s+/, '') // 移除开头的IEEE
            .replace(/^proceedings\s+of\s+(the\s+)?/, '') // 移除 "Proceedings of (the)"
            .replace(/^conference\s+on\s+/, '') // 移除 "Conference on"
            .replace(/^international\s+conference\s+on\s+/, '') // 移除 "International Conference on"
            .replace(/^symposium\s+on\s+/, '') // 移除 "Symposium on"
            .replace(/^workshop\s+on\s+/, '') // 移除 "Workshop on"
            .replace(/^transactions\s+on\s+/, '') // 移除 "Transactions on"
            .replace(/^journal\s+of\s+(the\s+)?/, '') // 移除 "Journal of (the)"
            .replace(/^acm\s+/, '') // 移除开头的ACM
            .replace(/\s+magazine$/, '') // 移除末尾的Magazine
            .replace(/\s+letters$/, '') // 移除末尾的Letters
            .trim();

        return cleaned;
    }

    // 改进的CCF等级查找函数
    function lookupCcfRank(venueString) {
        if (!venueString) return null;

        const lowerVenue = venueString.toLowerCase();

        // 1. 完全匹配
        if (ccfCatalog[lowerVenue]) {
            return ccfCatalog[lowerVenue];
        }

        // 2. 清理后的匹配
        const cleanedVenue = cleanVenueString(lowerVenue);
        if (ccfCatalog[cleanedVenue]) {
            return ccfCatalog[cleanedVenue];
        }

        // 3. 部分匹配 - 检查是否包含已知的期刊/会议名称
        for (const [abbr, rank] of Object.entries(ccfCatalog)) {
            // 检查venue中是否包含缩写
            if (cleanedVenue.includes(abbr) || abbr.includes(cleanedVenue)) {
                return rank;
            }

            // 检查关键词匹配
            const venueWords = cleanedVenue.split(/\s+/);
            const abbrWords = abbr.split(/\s+/);

            // 如果所有缩写词都在venue中找到
            if (abbrWords.length > 1 && abbrWords.every(word =>
                venueWords.some(vw => vw.includes(word) || word.includes(vw))
            )) {
                return rank;
            }
        }

        // 4. 缩写匹配 - 生成首字母缩写
        const acronym = cleanedVenue
            .split(/\s+/)
            .filter(word => word.length > 2) // 过滤掉短词如"of", "on", "in"
            .map(word => word.charAt(0))
            .join('');

        if (acronym && ccfCatalog[acronym]) {
            return ccfCatalog[acronym];
        }

        // 5. 特殊处理一些常见的IEEE期刊模式
        const ieeeTransPattern = /ieee.*transactions?\s+on\s+(.+)/i;
        const ieeeConfPattern = /ieee.*(?:international\s+)?(?:conference|symposium|workshop)\s+on\s+(.+)/i;

        const transMatch = lowerVenue.match(ieeeTransPattern);
        if (transMatch) {
            const subject = transMatch[1].trim();
            if (ccfCatalog[subject]) {
                return ccfCatalog[subject];
            }
        }

        const confMatch = lowerVenue.match(ieeeConfPattern);
        if (confMatch) {
            const subject = confMatch[1].trim();
            if (ccfCatalog[subject]) {
                return ccfCatalog[subject];
            }
        }

        return null;
    }

    // 改进的venue信息提取函数
    function extractVenueFromText(text) {
        // 常见的IEEE期刊/会议模式
        const patterns = [
            // IEEE Transactions
            /IEEE\s+Transactions\s+on\s+([^,;.\n]+)/i,
            /IEEE\s+([^,;.\n]+)\s+Transactions/i,

            // IEEE期刊
            /IEEE\s+Journal\s+(?:of\s+|on\s+)?([^,;.\n]+)/i,
            /IEEE\s+([^,;.\n]+)\s+Journal/i,

            // IEEE会议
            /IEEE\s+(?:International\s+)?Conference\s+on\s+([^,;.\n]+)/i,
            /IEEE\s+(?:International\s+)?Symposium\s+on\s+([^,;.\n]+)/i,
            /IEEE\s+(?:International\s+)?Workshop\s+on\s+([^,;.\n]+)/i,
            /IEEE\s+([^,;.\n]+)\s+(?:Conference|Symposium|Workshop)/i,

            // ACM期刊会议
            /ACM\s+Transactions\s+on\s+([^,;.\n]+)/i,
            /ACM\s+([^,;.\n]+)\s+Conference/i,
            /ACM\s+SIGMOD\s+Conference/i,
            /ACM\s+SIGKDD\s+Conference/i,
            /ACM\s+SIGIR\s+Conference/i,
            /ACM\s+SIGCOMM/i,
            /ACM\s+CHI/i,

            // 一般模式
            /Proceedings\s+of\s+(?:the\s+)?([^,;.\n]+)/i,
            /(\d{4}\s+(?:IEEE|ACM)[^,;.\n]+)/i,

            // 简单的期刊名模式
            /([A-Z][a-zA-Z\s]+(?:Journal|Magazine|Letters|Review))/,

            // 会议名模式
            /(?:International\s+)?(?:Conference|Symposium|Workshop)\s+on\s+([^,;.\n]+)/i,
        ];

        for (let pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                let venue = match[1] ? match[1].trim() : match[0].trim();
                // 移除末尾的标点符号和年份
                venue = venue.replace(/[,;.\s]+\d{4}.*$/, '').trim();
                if (venue.length > 3) { // 确保不是太短的匹配
                    return venue;
                }
            }
        }

        return null;
    }

    // 页面处理函数保持不变，但使用改进的匹配逻辑
    function processAllResults() {
        console.log('[IEEE Xplore CCF Rank] 脚本启动...');

        const possibleSelectors = [
            '.List-results-items .result-item',
            '.result-item',
            '.result',
            '.search-result',
            '.document',
            '.item',
            '[class*="result"]',
            '[class*="item"]',
            '[class*="document"]'
        ];

        let results = [];

        for (let selector of possibleSelectors) {
            results = document.querySelectorAll(selector);
            if (results.length > 0) {
                console.log(`[IEEE Xplore CCF Rank] 使用选择器 "${selector}" 找到 ${results.length} 个结果`);
                break;
            }
        }

        if (results.length === 0) {
            console.log('[IEEE Xplore CCF Rank] 未找到任何结果，尝试寻找通用元素...');
            const titleElements = document.querySelectorAll('h3, h2, .title, [class*="title"]');
            if (titleElements.length > 0) {
                console.log(`[IEEE Xplore CCF Rank] 找到 ${titleElements.length} 个可能的标题元素`);
                titleElements.forEach((element, index) => {
                    processTitleElement(element, index);
                });
                return;
            }
        }

        console.log(`[IEEE Xplore CCF Rank] 开始处理 ${results.length} 个结果...`);
        results.forEach((result, index) => {
            processSingleResult(result, index);
        });
    }

    function processTitleElement(titleElement, index) {
        let container = titleElement.closest('.result-item') ||
                       titleElement.closest('.result') ||
                       titleElement.closest('.item') ||
                       titleElement.closest('[class*="result"]') ||
                       titleElement.parentElement;

        if (!container) {
            container = titleElement.parentElement;
        }

        processSingleResult(container, index);
    }

    function processSingleResult(resultElement, index) {
        if (resultElement.querySelector('.ccf-rank-info')) {
            return;
        }

        const venueSelectors = [
            '.publication-title',
            '.document-title',
            '.pub-title',
            '.venue',
            '.conference',
            '.journal',
            '.publisher',
            '.source',
            '[class*="publication"]',
            '[class*="venue"]',
            '[class*="conference"]',
            '[class*="journal"]',
            'a[href*="/xpl/RecentIssue"]',
            'a[href*="/xpl/conhome"]'
        ];

        let venueElement = null;
        let venueText = '';

        for (let selector of venueSelectors) {
            venueElement = resultElement.querySelector(selector);
            if (venueElement) {
                venueText = venueElement.textContent.trim();
                if (venueText) {
                    console.log(`[IEEE Xplore CCF Rank] #${index}: 找到venue "${venueText}" 使用选择器 "${selector}"`);
                    break;
                }
            }
        }

        if (!venueText) {
            const textContent = resultElement.textContent;
            venueText = extractVenueFromText(textContent);
            if (venueText) {
                console.log(`[IEEE Xplore CCF Rank] #${index}: 从文本中提取venue "${venueText}"`);
            }
        }

        if (venueText) {
            const ccfRank = lookupCcfRank(venueText);

            if (ccfRank) {
                const insertionPoint = findInsertionPoint(resultElement);
                if (insertionPoint) {
                    displayCcfRank(insertionPoint, venueText, ccfRank, index);
                }
            } else {
                console.log(`[IEEE Xplore CCF Rank] #${index}: 未找到CCF等级 for "${venueText}"`);
            }
        } else {
            console.log(`[IEEE Xplore CCF Rank] #${index}: 未找到venue信息`);
        }
    }

    function findInsertionPoint(resultElement) {
        const possiblePoints = [
            resultElement.querySelector('.authors'),
            resultElement.querySelector('.author'),
            resultElement.querySelector('.publication-title'),
            resultElement.querySelector('.document-title'),
            resultElement.querySelector('.title'),
            resultElement.querySelector('h3'),
            resultElement.querySelector('h2'),
            resultElement.querySelector('a')
        ];

        for (let point of possiblePoints) {
            if (point) {
                return point;
            }
        }

        return resultElement;
    }

    function displayCcfRank(anchorElement, venueText, ccfRank, index) {
        const container = document.createElement('div');
        container.className = 'ccf-rank-info';
        container.style.cssText = `
            margin: 5px 0;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.85em;
            font-weight: bold;
            display: inline-block;
            color: white;
            background-color: ${ccfRank === 'A' ? '#d9534f' : ccfRank === 'B' ? '#f0ad4e' : '#5bc0de'};
        `;

        container.textContent = `CCF-${ccfRank}`;
        container.title = `Venue: ${venueText}`;

        try {
            if (anchorElement.nextSibling) {
                anchorElement.parentNode.insertBefore(container, anchorElement.nextSibling);
            } else {
                anchorElement.parentNode.appendChild(container);
            }
            console.log(`[IEEE Xplore CCF Rank] #${index}: 成功显示 CCF-${ccfRank} for "${venueText}"`);
        } catch (e) {
            try {
                anchorElement.appendChild(container);
                console.log(`[IEEE Xplore CCF Rank] #${index}: 成功追加 CCF-${ccfRank} for "${venueText}"`);
            } catch (e2) {
                console.error(`[IEEE Xplore CCF Rank] #${index}: 插入失败`, e2);
            }
        }
    }

    function waitForPageLoad() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(processAllResults, 1000);
            });
        } else {
            setTimeout(processAllResults, 1000);
        }
    }

    function observeChanges() {
        const observer = new MutationObserver((mutations) => {
            let shouldProcess = false;

            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (let node of mutation.addedNodes) {
                        if (node.nodeType === 1 && (
                            node.classList.contains('result-item') ||
                            node.classList.contains('result') ||
                            node.querySelector && node.querySelector('.result-item, .result')
                        )) {
                            shouldProcess = true;
                            break;
                        }
                    }
                }
            });

            if (shouldProcess) {
                setTimeout(processAllResults, 500);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    console.log('[IEEE Xplore CCF Rank] 改进版脚本已加载 - 基于CCF 2022官方目录');
    waitForPageLoad();
    observeChanges();

})();
