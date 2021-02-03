importScripts("./worker_comlink.js")

let files_data = {}

function handleDownloadData(chunk) {
    // console.log(chunk)
    if (!chunk.done)
        if (files_data[chunk.file_id]) {
            files_data[chunk.file_id] = new Uint8Array([
                ...files_data[chunk.file_id],
                ...new Uint8Array(chunk.value),
            ])
        } else {
            files_data[chunk.file_id] = new Uint8Array([
                ...new Uint8Array(chunk.value),
            ])
        }
}
function getFileData(id) {
    return files_data[id]
}
Comlink.expose({ handleDownloadData, getFileData })
