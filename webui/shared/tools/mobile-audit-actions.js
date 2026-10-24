/*
 * 订阅页专用的第五项体检：一条订阅能做的十件事，在手机上是不是一件都没少。
 *
 * 为什么值得单独跑一趟：这是最贵的一类 bug，而且完全静默 ——
 * 界面不报错、不错位、体检的另外四项全绿，只是「编辑」那颗按钮不在了。
 * 之前坏过两次，两次都是同一个手法：拿 CSS 把图标行里多余的按钮 display: none，
 * 而「更多」菜单是按「一颗没藏」算的，藏掉的那颗于是哪儿都不在。
 *
 * 所以这里不查实现，只查结果：图标行上看得见的 + 菜单里点得到的，
 * 两边并起来必须覆盖 aniActions 里的全部动作。
 * 将来不管用什么新写法把动作弄丢，这一条都会响。
 *
 * 这份清单要跟着 aniActions 一起改：加了动作不补进来，新动作丢了没人知道。
 */
(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms))
    const seen = new Set()
    const vis = el => {
        const r = el.getBoundingClientRect()
        return r.width > 0 && r.height > 0 && el.offsetParent !== null
    }

    for (const el of document.querySelectorAll('[title]')) {
        if (vis(el)) seen.add(el.getAttribute('title').trim())
    }

    /* 召出第一条订阅的「更多」菜单。各款的叫法不同，但都在 title 上 */
    const more = [...document.querySelectorAll('[title]')]
        .find(el => vis(el) && ['更多', '操作', '展开操作'].includes(el.getAttribute('title').trim()))
    if (more) {
        more.click()
        await sleep(400)
        for (const el of document.querySelectorAll('.v-overlay .v-list-item-title, .v-overlay li')) {
            const t = el.textContent.trim()
            if (t) seen.add(t)
        }
        document.body.click()
        await sleep(200)
    }

    /* 启用/停用是一颗按钮两种字面，命中一个就算有 */
    const NEED = [
        ['列表'], ['编辑'], ['预览匹配结果'], ['刷新这一条'],
        ['刮削'], ['强制刮削'],
        ['停用', '启用'], ['更换封面'], ['评分'], ['删除'],
    ]
    return {
        missing: NEED.filter(alts => !alts.some(t => seen.has(t))).map(a => a[0]),
        found: [...seen].filter(t => t.length < 12),
        hadMenu: !!more,
    }
})()
