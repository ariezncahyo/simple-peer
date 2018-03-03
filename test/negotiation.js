var common = require('./common')
var Peer = require('../')
var test = require('tape')

var config
test('get config', function (t) {
  common.getConfig(function (err, _config) {
    if (err) return t.fail(err)
    config = _config
    t.end()
  })
})

test('single negotiation', function (t) {
  if (common.wrtc) {
    t.pass('Skipping test, no MediaStream support on wrtc')
    t.end()
    return
  }
  t.plan(10)

  var peer1 = new Peer({ config: config, initiator: true, stream: common.getMediaStream(), wrtc: common.wrtc })
  var peer2 = new Peer({ config: config, stream: common.getMediaStream(), wrtc: common.wrtc })

  peer1.on('signal', function (data) { if (!peer2.destroyed) peer2.signal(data) })
  peer2.on('signal', function (data) { if (!peer1.destroyed) peer1.signal(data) })

  peer1.on('connect', function () {
    t.pass('peer1 connected')
  })
  peer2.on('connect', function () {
    t.pass('peer2 connected')
  })

  peer1.on('stream', function (stream) {
    t.pass('peer1 got stream')
  })
  peer2.on('stream', function (stream) {
    t.pass('peer2 got stream')
  })

  var trackCount1 = 0
  peer1.on('track', function (track) {
    t.pass('peer1 got track')
    trackCount1++
    if (trackCount1 >= 2) {
      t.pass('got correct number of tracks')
    }
  })
  var trackCount2 = 0
  peer2.on('track', function (track) {
    t.pass('peer2 got track')
    trackCount2++
    if (trackCount2 >= 2) {
      t.pass('got correct number of tracks')
    }
  })
})

test('forced renegotiation', function (t) {
  t.plan(2)

  var peer1 = new Peer({ config: config, initiator: true, wrtc: common.wrtc })
  var peer2 = new Peer({ config: config, wrtc: common.wrtc })

  peer1.on('signal', function (data) { if (!peer2.destroyed) peer2.signal(data) })
  peer2.on('signal', function (data) { if (!peer1.destroyed) peer1.signal(data) })

  peer1.on('connect', function () {
    peer1.renegotiate()
    peer1.on('negotiate', function () {
      t.pass('peer1 negotiated')
    })
    peer2.on('negotiate', function () {
      t.pass('peer2 negotiated')
    })
  })
})

test('repeated forced renegotiation', function (t) {
  t.plan(6)

  var peer1 = new Peer({ config: config, initiator: true, wrtc: common.wrtc })
  var peer2 = new Peer({ config: config, wrtc: common.wrtc })

  peer1.on('signal', function (data) { if (!peer2.destroyed) peer2.signal(data) })
  peer2.on('signal', function (data) { if (!peer1.destroyed) peer1.signal(data) })

  peer1.once('connect', function () {
    peer1.renegotiate()
  })
  peer1.once('negotiate', function () {
    t.pass('peer1 negotiated')
    peer1.renegotiate()
    peer1.once('negotiate', function () {
      t.pass('peer1 negotiated again')
      peer1.renegotiate()
      peer1.once('negotiate', function () {
        t.pass('peer1 negotiated again')
      })
    })
  })
  peer2.once('negotiate', function () {
    t.pass('peer2 negotiated')
    peer2.renegotiate()
    peer2.once('negotiate', function () {
      t.pass('peer2 negotiated again')
      peer1.renegotiate()
      peer1.once('negotiate', function () {
        t.pass('peer1 negotiated again')
      })
    })
  })
})

test('renegotiation after addStream', function (t) {
  if (common.wrtc) {
    t.pass('Skipping test, no MediaStream support on wrtc')
    t.end()
    return
  }
  t.plan(4)

  var peer1 = new Peer({ config: config, initiator: true, wrtc: common.wrtc })
  var peer2 = new Peer({ config: config, wrtc: common.wrtc })

  peer1.on('signal', function (data) { if (!peer2.destroyed) peer2.signal(data) })
  peer2.on('signal', function (data) { if (!peer1.destroyed) peer1.signal(data) })

  peer1.on('connect', function () {
    t.pass('peer1 connect')
    peer1.addStream(common.getMediaStream())
    peer1.renegotiate()
  })
  peer2.on('connect', function () {
    t.pass('peer2 connect')
    peer2.addStream(common.getMediaStream())
    peer2.renegotiate()
  })
  peer1.on('stream', function () {
    t.pass('peer1 got stream')
  })
  peer2.on('stream', function () {
    t.pass('peer2 got stream')
  })
})

test('renegotiation after removeStream', function (t) {
  if (common.wrtc) {
    t.pass('Skipping test, no MediaStream support on wrtc')
    t.end()
    return
  }
  t.plan(8)

  var peer1 = new Peer({ config: config, initiator: true, wrtc: common.wrtc })
  var peer2 = new Peer({ config: config, wrtc: common.wrtc })

  peer1.on('signal', function (data) { if (!peer2.destroyed) peer2.signal(data) })
  peer2.on('signal', function (data) { if (!peer1.destroyed) peer1.signal(data) })

  var senders1 = peer1.addStream(common.getMediaStream())
  var senders2 = peer2.addStream(common.getMediaStream())
  peer1.renegotiate()

  peer1.on('stream', function (stream) {
    t.equals(stream.getTracks().length, 2, 'peer2 got stream with right tracks')
    peer2.removeStream(senders2)
    peer2.renegotiate()
  })
  peer1.on('removetrack', function (track) {
    t.pass('remote removetrack received')
  })
  peer1.on('removestream', function (track) {
    t.pass('remote removestream received')
  })

  peer2.on('stream', function (stream) {
    t.equals(stream.getTracks().length, 2, 'peer2 got stream with right tracks')
    peer1.removeStream(senders1)
    peer1.renegotiate()
  })
  peer2.on('removetrack', function (track) {
    t.pass('remote removetrack received')
  })
  peer2.on('removestream', function (track) {
    t.pass('remote removestream received')
  })
})

test('renegotiation after removeTrack', function (t) {
  if (common.wrtc) {
    t.pass('Skipping test, no MediaStream support on wrtc')
    t.end()
    return
  }
  t.plan(6)

  var peer1 = new Peer({ config: config, initiator: true, wrtc: common.wrtc })
  var peer2 = new Peer({ config: config, wrtc: common.wrtc })

  peer1.on('signal', function (data) { if (!peer2.destroyed) peer2.signal(data) })
  peer2.on('signal', function (data) { if (!peer1.destroyed) peer1.signal(data) })

  var stream1 = common.getMediaStream()
  var stream2 = common.getMediaStream()

  var sender1 = peer1.addTrack(stream1.getTracks()[0], stream1)
  var sender2 = peer2.addTrack(stream2.getTracks()[0], stream2)
  peer1.renegotiate()

  peer1.on('stream', function (stream) {
    t.equals(stream.getTracks().length, 1, 'peer1 got stream with right tracks')
    peer2.removeTrack(sender2)
    peer2.renegotiate()
  })
  peer1.on('track', function (track) {
    t.pass('peer1 got track event')
  })
  peer1.on('removetrack', function (track) {
    t.pass('remote removetrack received')
  })

  peer2.on('stream', function (stream) {
    t.equals(stream.getTracks().length, 1, 'peer2 got stream with right tracks')
    peer1.removeTrack(sender1)
    peer1.renegotiate()
  })
  peer2.on('track', function (track) {
    t.pass('peer2 got track event')
  })
  peer2.on('removetrack', function (track) {
    t.pass('remote removetrack received')
  })
})
