📨 Poll received 1 events: Array(1)
(index):1460   [0] connected: {"type":"connected","roomId":"0V66G7","userId":"user_1773062020922_94lo8ygtb","userName":"saketh","roomUsers":[{"id":"user_1773062020922_94lo8ygtb","name":"saketh","color":"#20B2AA","isCreator":true}]...
(index):1472 📡 Connected event received: Object
(index):1475 💾 State after connected: Object
(index):1597 🔄 updateMembers called with: Array(1)
(index):1600   - saketh (id: user_1773062020922_94lo8ygtb, isCreator: true)
(index):1458 📨 Poll received 0 events: Array(0)
(index):1458 📨 Poll received 0 events: Array(0)
(index):1458 📨 Poll received 0 events: Array(0)
(index):1458 📨 Poll received 0 events: Array(0)
(index):1458 📨 Poll received 0 events: Array(0)
(index):1458 📨 Poll received 0 events: Array(0)
(index):1458 📨 Poll received 0 events: Array(0)
(index):1458 📨 Poll received 0 events: Array(0)
(index):1458 📨 Poll received 0 events: Array(0)
(index):1458 📨 Poll received 0 events: Array(0)
(index):1458 📨 Poll received 0 events: Array(0)
(index):1458 📨 Poll received 0 events: Array(0)
(index):1458 📨 Poll received 0 events: Array(0)
(index):1458 📨 Poll received 1 events: Array(1)
(index):1460   [0] user_joined_room: {"type":"user_joined_room","userId":"user_1773062033220_95336njbv","userName":"nani","userColor":"#FFEAA7","roomUsers":[{"id":"user_1773062020922_94lo8ygtb","name":"saketh","color":"#20B2AA","isCreato...
(index):1480 👤 User joined event received: Object
(index):1482 💾 State after user joined: Object
(index):1597 🔄 updateMembers called with: Array(2)
(index):1600   - saketh (id: user_1773062020922_94lo8ygtb, isCreator: false)
(index):1600   - nani (id: user_1773062033220_95336njbv, isCreator: false)

📨 Poll received 1 events: Array(1)
(index):1460   [0] connected: {"type":"connected","roomId":"0V66G7","userId":"user_1773062033220_95336njbv","userName":"nani","roomUsers":[{"id":"user_1773062020922_94lo8ygtb","name":"saketh","color":"#20B2AA","isCreator":false},{...
(index):1472 📡 Connected event received: Object
(index):1475 💾 State after connected: Object
(index):1597 🔄 updateMembers called with: Array(2)
(index):1600   - saketh (id: user_1773062020922_94lo8ygtb, isCreator: false)
(index):1600   - nani (id: user_1773062033220_95336njbv, isCreator: false)

 Poll received 1 events: ['message_received']
(index):1460   [0] message_received: {"type":"message_received","id":"msg_1773062137050_1xc3sy04u","senderId":"user_1773062033220_95336njbv","senderName":"nani","senderColor":"#FFEAA7","content":"hello","timestamp":1773062137051,"isCreat...


 Poll received 3 events: (3) ['user_typing', 'user_typing', 'user_typing']
(index):1460   [0] user_typing: {"type":"user_typing","userId":"user_1773062033220_95336njbv","userName":"nani"}...
(index):1460   [1] user_typing: {"type":"user_typing","userId":"user_1773062033220_95336njbv","userName":"nani"}...
(index):1460   [2] user_typing: {"type":"user_typing","userId":"user_1773062033220_95336njbv","userName":"nani"}...
(index):1458 📨 Poll received 1 events: ['user_typing']
(index):1460   [0] user_typing: {"type":"user_typing","userId":"user_1773062033220_95336njbv","userName":"nani"}...



🔄 updateMembers called with: (3) [{…}, {…}, {…}]
(index):1600   - saketh (id: user_1773062020922_94lo8ygtb, isCreator: false)
(index):1600   - nani (id: user_1773062033220_95336njbv, isCreator: false)
(index):1600   - Bavy (id: user_1773062302402_n8dvekyoe, isCreator: false)


📨 Poll received 2 events: (2) ['user_typing', 'user_typing']
(index):1460   [0] user_typing: {"type":"user_typing","userId":"user_1773062302402_n8dvekyoe","userName":"Bavy"}...
(index):1460   [1] user_typing: {"type":"user_typing","userId":"user_1773062302402_n8dvekyoe","userName":"Bavy"}...
(index):1458 📨 Poll received 3 events: (3) ['user_typing', 'user_typing', 'user_typing']
(index):1460   [0] user_typing: {"type":"user_typing","userId":"user_1773062302402_n8dvekyoe","userName":"Bavy"}...
(index):1460   [1] user_typing: {"type":"user_typing","userId":"user_1773062302402_n8dvekyoe","userName":"Bavy"}...
(index):1460   [2] user_typing: {"type":"user_typing","userId":"user_1773062302402_n8dvekyoe","userName":"Bavy"}...




Mar 09 18:49:35.22
GET
---
konnectroom.vercel.app
/api/chat
📥 Poll from Bavy (user_1773062302402_n8dvekyoe): 0 events
Mar 09 18:49:35.12
GET
304
konnectroom.vercel.app
/api/chat
6
Error parsing message: SyntaxError: "[object Object]" is not valid JSON at JSON.parse (<anonymous>) at handleRefreshRoomState (/var/task/api/chat.js:523:30) at process.processTicksAndRejections (node:internal/process/task_queues:103:5) at async Object.handler (/var/task/api/chat.js:637:22) at async r (/opt/rust/nodejs.js:2:15572) at async Server.<anonymous> (/opt/rust/nodejs.js:2:11594) at async Server.<anonymous> (/opt/rust/nodejs.js:17:10190)
Mar 09 18:49:35.12
GET
200
konnectroom.vercel.app
/api/chat
📥 Poll from nani (user_1773062033220_95336njbv): 0 events
Mar 09 18:49:35.01
GET
200
konnectroom.vercel.app
/api/chat
📥 Poll from Bavy (user_1773062302402_n8dvekyoe): 0 events
Mar 09 18:49:34.92
GET
---
konnectroom.vercel.app
/api/chat
📥 Poll from nani (user_1773062033220_95336njbv): 0 events
Mar 09 18:49:34.87
GET
304
konnectroom.vercel.app
/api/chat
📥 Poll from saketh (user_1773062020922_94lo8ygtb): 0 events
Mar 09 18:49:34.82
GET
200
konnectroom.vercel.app
/api/chat
6
Error parsing message: SyntaxError: "[object Object]" is not valid JSON at JSO


nothing is working properly , no proper notification , no proper message showing , no past messages nothing . the old version was working too perfect (before today's edited version)

the first message is not visible to sender them selves , but seen by receivers . 