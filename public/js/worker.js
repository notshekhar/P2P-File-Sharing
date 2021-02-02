importScripts("./worker_comlink.js")

let files_data = {}

function handleDownloadData(chunk) {
    return chunk
}
function getFileData(id) {
    return id
}
Comlink.expose({ handleDownloadData, getFileData })
