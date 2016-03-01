'use strict'
var fmt = require('util').format
var fs = require('fs')
var path = require('path')
var _ = require('underscore')

var init = require('./init')
var AV = require('leanengine')
var request = require('superagent')
var osmosis = require('osmosis')
var colors = require('colors')
var config ={
    tagList:[{
        "id": "JavaScript",
        "name": "JavaScript"
    }]
}

// object
var Conf = AV.Object.extend('Conf')
var Test = AV.Object.extend('Test')
var Article = AV.Object.extend('Article')

var qyTest = new AV.Query(Test)

var _stream = fs.createWriteStream('../log/chuang.js', {
	flags: 'a', 
	encoding: 'utf-8'
})

function _log(content){
	_stream.write(content)
}

process.on('uncaughtException', function (err) {
  console.log('--', index, err)
});

/**
 * fing article by id in leancloud	
 */
function findArticleById(id, callback){
	var queryAt = new AV.Query('Article')
	
	queryAt.equalTo("article_id", id)

	queryAt.find({
	    success: function(results) {
	    	if(results.length > 0){
	    		console.log('存在', id, results.length)
	    		callback && callback(true)
	    	}else{
				callback && callback(false)
	    	}
	    },
	    error: function(error) {
	        callback && callback(false)
	    }
	})
}

/**
 * post article 到 avoscloud	
 */
function postArticle (params, callback){
    var at = new Article()

    if(!params.article_id) return

    var ar_id = params.article_id.slice(3)

    findArticleById(ar_id, function(flag){
    	if(flag) return
		// 设置数据
	    at.set('account_avatar', params.account_avatar)
	    at.set('update_time', params.update_time)
	    at.set('article_id', ar_id)
	    
	    at.set('tag_id', params.tag.id)
	    at.set('tag_name', params.tag.name)

	    at.save().then(function (obj) {
		  //对象保存成功
		  // console.log(obj)
		}, function (error) {
		  //对象保存失败，处理 error
		  _log(error)
		}).always(function(){
		  //无论成功还是失败，都调用到这里
		  callback && callback('done')
		})    	
    })

}
/**
 * 获取所有列表的文章id
 */
var _num = 0
function getListFromUrl(url, cbData, cbDone){
	console.log('get url:', url)
	osmosis
	.config({ 
		tries: 1,
		timeout: 10 * 60 * 1000,
		concurrency: 1
	})
	.get(url)	// 列表页url
	.find('.pagedlist_item')
	.set({
		'account_avatar': '.profile_photo_img@src',		// 微信公众账号avatar
		'update_time': 'span.timestamp',
		'article_id': '.question_link@href',			// 文章id 对应的是 chuansong.me 上的id
	})
	.data(function (listing){
		_num++
		cbData && cbData(listing)	// 返回数据

		console.log(colors.yellow.underline(_num), colors.yellow(listing.article_id))
		_log(fmt(_num + listing.article_id + '\n'))
	})
	.done(function(s){
		cbDone && cbDone()	// 一次爬虫完毕
	})
	.error(function(err){
		_log(fmt(err))
	})
}
/**
 * delay 	
 */
function getPageDelay(base, page, ctag, callback){
	var url = base + page

	getListFromUrl(url, function (data){
		data['tag'] = ctag
		postArticle(data)	// 写入avos
	},function(){
		page += 25
		console.log(index, page)
		if(page > 925){
			callback && callback()
			return
		}
		setTimeout(function(){
			getPageDelay(base, page, ctag, callback)			
		}, 3000)
	})
}

var index = 0
function getPageFormTag(){
	var tag = config.tagList[index]
	var tid = tag.id === 'newest' ? '' : tag.id
	var tname = tag.name
	var base = 'http://chuansong.me/'
	
	var url = base + tid + '?start='

	getPageDelay(url, 0, tag, function(){
		index ++
		if(index > config.tagList.length -1) return
		getPageFormTag()
	})
}

getPageFormTag()
