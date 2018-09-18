const {ipcRenderer} = require('electron')

const ipcit = () => {
	if (document.getElementById('input').value === ""){
		alert("aint no urls in here")
	} else if (document.getElementById("pageCount").value ==="") {
		alert("how many maaan")
	} else {
	ipcRenderer.send('asynchronous-message', [document.getElementById('input').value, document.getElementById("pageCount").value])
	}
}

const delipcit = () => {
	ipcRenderer.send('del-message')
}

const queryipcit = () => {
	ipcRenderer.send('query-message', document.getElementById('query').value)
}

const addToPage = (datas) => {
	divEl = document.getElementById("content")
	divEl.innerHTML = datas
}

const addToPageQuery = (datas) => {
	divEl = document.getElementById("queryRes")
	divEl.innerHTML = datas
}

const buttonEl = document.getElementById("but")
const delEl = document.getElementById("del")
const queryEl = document.getElementById('queryBut')

buttonEl.addEventListener("click", ipcit)
delEl.addEventListener("click", delipcit)
queryEl.addEventListener("click", queryipcit)

ipcRenderer.on('asynchronous-reply', (event, arg) => {
	addToPage(arg)
})

ipcRenderer.on('query-reply', (event, arg) => {
	addToPageQuery(arg)
})
