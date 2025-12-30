
// ==UserScript==
// @name         arXiv CCF Rank Displayer (Fixed)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  在 arXiv 搜索结果页面显示论文的 CCF-2022 分级（基于官方目录改进，修复显示问题）
// @author       Your Name & AI Assistant
// @match        *://arxiv.org/search/*
// @match        *://arxiv.org/list/*
// @grant        GM_xmlhttpRequest
// @connect      dblp.org
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
        'international conference on learning representations': 'A', // ICLR (虽然不在官方CCF列表中，但影响力很大)
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
        'wacv': 'B', // WACV - Winter Conference on Applications of Computer Vision
        'bmvc': 'B', // BMVC - British Machine Vision Conference
        'winter conference on applications of computer vision': 'B', // WACV
        'british machine vision conference': 'B', // BMVC
    };

    // DBLP查询缓存
    const dblpCache = new Map();
    const processedPapers = new Set();

    function processAllResults() {
        // 使用原脚本的选择器，适配arXiv搜索结果页面
        const results = document.querySelectorAll('li.arxiv-result');
        console.log(`[arXiv CCF Rank] 找到 ${results.length} 个搜索结果，开始处理...`);

        results.forEach((result, index) => {
            processSingleResult(result, index);
        });
    }

    function processSingleResult(resultElement, index) {
        // 避免重复处理
        if (resultElement.querySelector('.ccf-rank-info')) {
            return;
        }

        // 使用原脚本的DOM结构
        const titleElement = resultElement.querySelector('p.title');
        const commentsElement = resultElement.querySelector('p.comments');
        const authorsElement = resultElement.querySelector('p.authors');

        if (!authorsElement) return;

        const paperTitle = titleElement ? titleElement.textContent.trim() : '';
        const commentText = commentsElement ? commentsElement.textContent.trim() : '';

        console.log(`[arXiv CCF Rank] #${index}: 处理论文 "${paperTitle}"`);

        // 1. 首先尝试从comments解析
        const venueFromComment = parseVenueFromComments(commentText);
        if (venueFromComment) {
            console.log(`[arXiv CCF Rank] #${index}: 从comments解析到venue: "${venueFromComment}"`);
            const ccfRank = lookupCcfRank(venueFromComment);
            displayVenueInfo(authorsElement, venueFromComment, 'comment', ccfRank);
            return;
        }

        // 2. 如果comments中没有找到，尝试DBLP查询
        if (paperTitle) {
            console.log(`[arXiv CCF Rank] #${index}: Comments中未找到venue，尝试DBLP查询...`);
            queryDblp(paperTitle, authorsElement, index);
        }
    }

    // 改进的Comments解析函数
    function parseVenueFromComments(text) {
        if (!text) return null;

        console.log(`[arXiv CCF Rank] 解析comments: "${text}"`);

        // 多种模式匹配，按优先级排序
        const patterns = [
            // 明确的发表状态
            /(?:accepted (?:to|at|by)|published (?:in|at)|to appear (?:in|at)|appearing (?:in|at)|presented (?:at|in))\s+([^,;.\n]+?)(?:\s+\d{4})?(?:[,;.\n]|$)/i,

            // 会议proceedings模式
            /(?:proceedings of (?:the\s+)?|proc\.?\s+of\s+(?:the\s+)?)\s*([^,;.\n]+?)(?:\s+\d{4})?(?:[,;.\n]|$)/i,

            // 期刊模式
            /(?:journal of|transactions on|magazine)\s+([^,;.\n]+?)(?:\s+\d{4})?(?:[,;.\n]|$)/i,

            // 直接的会议名称（全大写缩写）
            /\b(CVPR|ICCV|ECCV|NeurIPS|NIPS|ICML|ICLR|ACL|EMNLP|NAACL|SIGGRAPH|CHI|UIST|WACV|BMVC|AAAI|IJCAI|SIGCOMM|MobiCom|INFOCOM|NSDI|CCS|S&P|CRYPTO|PLDI|POPL|FSE|ESEC|SOSP|OOPSLA|ASE|ICSE|ISSTA|OSDI|SIGMOD|SIGKDD|KDD|ICDE|SIGIR|VLDB|STOC|SODA|CAV|FOCS|LICS|WWW|RTSS|ICRA|ICASSP|ICME|MICCAI|BIBM|COGSCI|EMSOFT|ISMB|RECOMB)\b(?:\s+\d{4})?/i,

            // IEEE/ACM会议模式
            /(?:IEEE|ACM)\s+([^,;.\n]+?)(?:\s+\d{4})?(?:[,;.\n]|$)/i,

            // 更宽松的模式
            /(?:in|at)\s+([A-Z][^,;.\n]{2,50}?)(?:\s+\d{4})?(?:[,;.\n]|$)/i,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                let venue = match[1] ? match[1].trim() : match[0].trim();
                venue = cleanVenueString(venue);

                if (isValidVenue(venue)) {
                    console.log(`[arXiv CCF Rank] 提取到venue: "${venue}"`);
                    return venue;
                }
            }
        }

        return null;
    }

    // 改进的venue清理函数
    function cleanVenueString(venue) {
        return venue
            .replace(/\d{4}$/, '') // 移除末尾的年份
            .replace(/'\d{2}$/, '') // 移除末尾的 '23 这种年份
            .replace(/\(.*?\)/g, '') // 移除括号内容
            .replace(/\[.*?\]/g, '') // 移除方括号内容
            .replace(/^\d+\w*\s+/, '') // 移除开头序号
            .replace(/^(?:the\s+)?/i, '') // 移除开头的"the"
            .replace(/^(?:ieee|acm)\s+/i, '') // 移除开头的IEEE/ACM
            .replace(/^(?:proceedings\s+of\s+(?:the\s+)?)/i, '') // 移除 "Proceedings of (the)"
            .replace(/^(?:international\s+)?(?:conference|symposium|workshop)\s+on\s+/i, '') // 移除会议前缀
            .replace(/^(?:transactions|journal)\s+(?:of|on)\s+/i, '') // 移除期刊前缀
            .replace(/\s+(?:conference|symposium|workshop|journal|magazine|letters)$/i, '') // 移除后缀
            .replace(/\s+/g, ' ')
            .trim();
    }

    // venue有效性检查
    function isValidVenue(venue) {
        if (!venue || venue.length < 2 || venue.length > 100) return false;

        const excludeWords = ['paper', 'under review', 'submitted', 'draft', 'version', 'update', 'revision', 'pages', 'pp'];
        const lowerVenue = venue.toLowerCase();

        for (let word of excludeWords) {
            if (lowerVenue.includes(word)) return false;
        }

        return true;
    }

    // DBLP查询函数（保持原有逻辑但添加缓存）
    function queryDblp(title, injectionPoint, index) {
        // 检查缓存
        if (dblpCache.has(title)) {
            const cachedResult = dblpCache.get(title);
            if (cachedResult.venue) {
                const ccfRank = lookupCcfRank(cachedResult.venue);
                displayVenueInfo(injectionPoint, cachedResult.displayString, 'dblp', ccfRank, cachedResult.dblpUrl);
            } else {
                displayVenueInfo(injectionPoint, 'Not Found', 'not_found', null);
            }
            return;
        }

        const encodedTitle = encodeURIComponent(title.replace(/[^\w\s]/gi, ''));
        const apiUrl = `https://dblp.org/search/publ/api?q=${encodedTitle}&format=json&h=1`;

        GM_xmlhttpRequest({
            method: "GET",
            url: apiUrl,
            timeout: 10000,
            onload: function(response) {
                if (response.status === 200) {
                    try {
                        const data = JSON.parse(response.responseText);
                        if (data.result?.hits?.hit?.[0]) {
                            const info = data.result.hits.hit[0].info;
                            const venue = info.venue;
                            const year = info.year;
                            const dblpUrl = info.url;
                            const displayString = `${venue} (${year})`;

                            // 缓存结果
                            dblpCache.set(title, { venue, displayString, dblpUrl });

                            const ccfRank = lookupCcfRank(venue);
                            displayVenueInfo(injectionPoint, displayString, 'dblp', ccfRank, dblpUrl);
                            console.log(`[arXiv CCF Rank] #${index}: DBLP查询成功: "${venue}"`);
                        } else {
                            // 缓存未找到的结果
                            dblpCache.set(title, { venue: null });
                            displayVenueInfo(injectionPoint, 'Not Found', 'not_found', null);
                            console.log(`[arXiv CCF Rank] #${index}: DBLP未找到结果`);
                        }
                    } catch (e) {
                        console.error(`[arXiv CCF Rank] #${index}: 解析DBLP响应失败`, e);
                    }
                } else {
                    console.error(`[arXiv CCF Rank] #${index}: DBLP请求失败，状态码: ${response.status}`);
                }
            },
            onerror: function(error) {
                console.error(`[arXiv CCF Rank] #${index}: DBLP请求网络错误`, error);
            },
            ontimeout: function() {
                console.error(`[arXiv CCF Rank] #${index}: DBLP请求超时`);
            }
        });
    }

    // 改进的CCF等级查找函数
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

        // 3. 部分匹配（精确匹配）
        for (const [abbr, rank] of Object.entries(ccfCatalog)) {
            // 完全包含匹配
            if (cleanedVenue === abbr || lowerVenue === abbr) {
                return rank;
            }

            // 检查是否为会议/期刊的缩写形式
            if (cleanedVenue.includes(abbr) && abbr.length > 2) {
                return rank;
            }
        }

        // 4. 缩写匹配
        const acronym = cleanedVenue
            .split(/\s+/)
            .filter(word => word.length > 2) // 过滤短词
            .map(word => word.charAt(0))
            .join('');

        if (acronym && ccfCatalog[acronym]) {
            return ccfCatalog[acronym];
        }

        return null;
    }

    // 显示函数（保持原有样式）
    function displayVenueInfo(anchorElement, venueText, source, ccfRank, url = null) {
        const container = document.createElement('div');
        container.className = 'ccf-rank-info'; // 添加标识class避免重复处理
        container.style.marginTop = '5px';
        container.style.fontSize = '0.9em';
        container.style.fontWeight = 'bold';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '8px';

        const venueElement = document.createElement(url ? 'a' : 'span');
        let icon = '';
        let bgColor = '';

        switch(source) {
            case 'dblp':
                icon = '✓ DBLP: ';
                bgColor = '#007b5f'; // 绿色
                break;
            case 'comment':
                icon = '💬 Comment: ';
                bgColor = '#005eaa'; // 蓝色
                break;
            case 'not_found':
                icon = 'DBLP: ';
                bgColor = '#868e96'; // 灰色
                break;
        }

        venueElement.textContent = icon + venueText;
        venueElement.style.padding = '3px 8px';
        venueElement.style.borderRadius = '4px';
        venueElement.style.color = 'white';
        venueElement.style.backgroundColor = bgColor;

        if (url) {
            venueElement.href = url;
            venueElement.target = '_blank';
            venueElement.rel = 'noopener noreferrer';
            venueElement.style.textDecoration = 'none';
        }

        container.appendChild(venueElement);

        if (ccfRank) {
            const ccfElement = document.createElement('span');
            ccfElement.textContent = `CCF-${ccfRank}`;
            ccfElement.style.padding = '3px 8px';
            ccfElement.style.borderRadius = '4px';
            ccfElement.style.color = 'white';

            switch (ccfRank) {
                case 'A':
                    ccfElement.style.backgroundColor = '#d9534f';
                    break; // 红色
                case 'B':
                    ccfElement.style.backgroundColor = '#f0ad4e';
                    break; // 橙色
                case 'C':
                    ccfElement.style.backgroundColor = '#5bc0de';
                    break; // 信息蓝
            }

            container.appendChild(ccfElement);
        }

        // 使用原脚本的插入逻辑
        anchorElement.parentNode.insertBefore(container, anchorElement.nextSibling);
    }

    // 页面加载和变化监听
    function init() {
        console.log('[arXiv CCF Rank] 脚本启动...');

        // 等待页面加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(processAllResults, 1000);
            });
        } else {
            setTimeout(processAllResults, 1000);
        }

        // 监听动态内容变化
        const observer = new MutationObserver((mutations) => {
            let shouldProcess = false;

            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (let node of mutation.addedNodes) {
                        if (node.nodeType === 1 && (
                            node.classList.contains('arxiv-result') ||
                            node.querySelector && node.querySelector('li.arxiv-result')
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

    // 启动脚本
    init();

})();
