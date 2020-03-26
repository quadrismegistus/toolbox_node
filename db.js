
NAMESPACE_VECS = 'vectors'


const Keyv = require('keyv')
// const keyv = new Keyv(DB_CONN_STR)
// const vecdb = new Keyv(DB_CONN_STR, {})

var M2VDB = {}

function  get_vecdb(model_id) {
	if(!(model_id in M2VDB)) { M2VDB[model_id] = new Keyv(DB_CONN_STR, {'namespace':model_id}) }
	return M2VDB[model_id]
}

async function test() {
	vecdb.set('model_word_1', [1,2,3,4,5,6,7,8,9,10])

	// console.log(await vecdb.get('model_word_1'))
}






exports.test=test