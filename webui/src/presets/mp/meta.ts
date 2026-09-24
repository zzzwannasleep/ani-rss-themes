import type {PresetMeta} from '../types'

const meta: PresetMeta = {
    id: 'mp',
    name: 'MoviePilot',
    tagline: '照着 MoviePilot 复刻：260px 侧栏，选中项是右半边的药丸 + 紫色渐变；内容封在 1440px 里',
    theme: 'mp',
    dashboard: true,
    /* MoviePilot 点海报是进详情，这一款原来整张海报点下去就是编辑订阅，默认值保住这个手感 */
    coverClick: 'edit',
}

export default meta
