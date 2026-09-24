import type {PresetMeta} from '../types'

const meta: PresetMeta = {
    id: 'macintosh',
    name: '经典 Macintosh',
    tagline: '一片 50% 网点的桌面，顶上一条苹果菜单栏，应用是一扇带条纹标题栏的方窗；订阅页是 Finder 的图标视图',
    theme: 'macintosh',
    /* 带总览。它长成「关于本机」那扇窗：版本号 + 几条横杠计量，
       正好是四个统计数字要的形状 */
    dashboard: true,
    /* Finder 的默认视图是图标视图，这一款的订阅页就是它：一格一张封面，
       名字压在下面的名牌上，选中整块反白 */
    defaultView: 'grid',
    /* 在 Finder 里点图标就是「打开」。这一款原来点封面就进编辑，默认值保住这个手感 */
    coverClick: 'edit',
}

export default meta
