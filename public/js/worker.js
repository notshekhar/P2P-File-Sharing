importScripts("./worker_comlink.js")

let files_data = {}
let recieved = {}
let sizes = {}

function handleDownloadData(chunk, size) {
    sizes[chunk.file_id] = size
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
    return (recieved[fid] / sizes[fid]) * 100
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
