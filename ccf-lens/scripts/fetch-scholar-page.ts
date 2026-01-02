/**
 * Script to fetch and analyze Google Scholar proxy site page structure
 * Run with: npx tsx scripts/fetch-scholar-page.ts
 */

const url = 'https://scholar.lanfanshu.cn/scholar?hl=zh-CN&as_sdt=0%2C5&q=aigc+detect&btnG='

async function fetchPage() {
  console.log('Fetching page:', url)
  console.log('---')
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      }
    })
    
    if (!response.ok) {
      console.error('Failed to fetch:', response.status, response.statusText)
      return
    }
    
    const html = await response.text()
    
    console.log('Page length:', html.length, 'characters')
    console.log('---')
    
    // Save full HTML for analysis
    const fs = await import('fs')
    fs.writeFileSync('scripts/scholar-page.html', html)
    console.log('Full HTML saved to scripts/scholar-page.html')
    console.log('---')
    
    // Analyze structure
    console.log('=== Page Structure Analysis ===')
    console.log('')
    
    // Check for search result containers with exact class
    const gsrExactMatch = html.match(/class="gs_r gs_or gs_scl"/g)
    console.log('Exact "gs_r gs_or gs_scl" class occurrences:', gsrExactMatch?.length || 0)
    
    // Check for gs_ri (result inner)
    const gsriMatch = html.match(/class="gs_ri"/g)
    console.log('gs_ri class occurrences:', gsriMatch?.length || 0)
    
    // Check for gs_rt (result title)
    const gsrtMatch = html.match(/class="gs_rt"/g)
    console.log('gs_rt class occurrences:', gsrtMatch?.length || 0)
    
    // Check for gs_a (authors/venue) - exact match
    const gsaExactMatch = html.match(/class="gs_a"/g)
    console.log('Exact gs_a class occurrences:', gsaExactMatch?.length || 0)
    
    // Check for data-cid attributes
    const dataCidMatch = html.match(/data-cid="[^"]+"/g)
    console.log('data-cid attributes:', dataCidMatch?.length || 0)
    if (dataCidMatch) {
      console.log('  Sample:', dataCidMatch.slice(0, 3))
    }
    
    console.log('')
    console.log('=== Extracting First Search Result ===')
    
    // Extract a complete search result block
    const resultRegex = /<div class="gs_r gs_or gs_scl"[^>]*data-cid="([^"]+)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*(?=<div class="gs_r|<div id="gs_res_ccl_bot|$)/g
    const results: Array<{cid: string, content: string}> = []
    let match
    while ((match = resultRegex.exec(html)) !== null) {
      results.push({ cid: match[1], content: match[0] })
    }
    
    console.log('Found', results.length, 'search results')
    
    if (results.length > 0) {
      const firstResult = results[0]
      console.log('\n--- First Result (cid:', firstResult.cid, ') ---')
      
      // Extract title
      const titleMatch = firstResult.content.match(/<h3 class="gs_rt"[^>]*>([\s\S]*?)<\/h3>/)
      if (titleMatch) {
        const titleLinkMatch = titleMatch[1].match(/<a[^>]*>([^<]+)<\/a>/)
        console.log('Title:', titleLinkMatch ? titleLinkMatch[1] : 'No link found')
      }
      
      // Extract venue/authors
      const venueMatch = firstResult.content.match(/<div class="gs_a">([^<]+)<\/div>/)
      if (venueMatch) {
        console.log('Venue text:', venueMatch[1])
      }
      
      console.log('\n--- Raw HTML of first result ---')
      console.log(firstResult.content.substring(0, 2000))
    }
    
    // Also extract using simpler pattern
    console.log('\n=== Alternative Extraction ===')
    const simpleResults = html.match(/<div class="gs_r gs_or gs_scl"[^>]*>[\s\S]*?<div class="gs_ri">[\s\S]*?<h3 class="gs_rt"[^>]*>[\s\S]*?<\/h3>[\s\S]*?<div class="gs_a">[^<]*<\/div>/g)
    console.log('Simple pattern matches:', simpleResults?.length || 0)
    
    if (simpleResults && simpleResults.length > 0) {
      console.log('\n--- First simple match ---')
      console.log(simpleResults[0])
    }
    
  } catch (error) {
    console.error('Error fetching page:', error)
  }
}

fetchPage()
