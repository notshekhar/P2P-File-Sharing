importScripts("./worker_comlink.js")

let files_data = {}
let recieved = {}
let sizes = {}
let downloadStartAt = {}

function handleDownloadData(chunk, size) {
    // console.log(chunk)
    if (!chunk.done) {
        if (files_data[chunk.file_id]) {
            // files_data[chunk.file_id] = new Uint8Array([
            //     ...files_data[chunk.file_id],
            //     ...new Uint8Array(chunk.value),
            // ])
            let data = new Uint8Array(chunk.value)
            for (let i = 0; i < data.length; i++) {
                files_data[chunk.file_id][i + recieved[chunk.file_id]] = data[i]
            }
            recieved[chunk.file_id] += data.length
        } else {
            files_data[chunk.file_id] = new Uint8Array(size)
            sizes[chunk.file_id] = size
            downloadStartAt[chunk.file_id] = Date.now()
            let data = new Uint8Array(chunk.value)
            for (let i = 0; i < data.length; i++) {
                files_data[chunk.file_id][i] = data[i]
            }
            recieved[chunk.file_id] = data.length
        }
    }
}
function getFileData(fid) {
    // console.log(files_data[id])
    return files_data[fid]
}
function downloadPercentage(fid) {
    // console.log(recieved[fid], sizes[fid])
    let t_in_sec = (Date.now() - downloadStartAt[fid]) / 1000
    return {
        per: (recieved[fid] / sizes[fid]) * 100,
        speed: recieved[fid] / t_in_sec,
        recieved: recieved[fid],
    }
}
function cleanMemory(fid) {
    files_data[fid] = new Uint8Array()
}
Comlink.expose({
    handleDownloadData,
    getFileData,
    cleanMemory,
    downloadPercentage,
})
