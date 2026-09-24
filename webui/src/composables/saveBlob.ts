/**
 * 把一个 Blob 存成本地文件（导出备份、导出订阅都走这里）。
 *
 * 两处细节各自踩过：
 *  - 链接要先挂进文档再点：没挂上的 <a> 在老版本 Firefox 里 click() 没反应，一点提示都没有。
 *  - object URL 不能点完就 revoke：浏览器是异步去读的，同步收走的话
 *    部分浏览器存出来是 0 字节。留 10 秒，够它读完，也不会一直占着内存。
 */
export function saveBlob(blob: Blob, filename: string): void {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.style.display = 'none'
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
}
