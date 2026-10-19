// Исходная программа пользователя. Описания и нагрузки сохранены без дополнений.
export const SEED = {
  version:1, selectedPlan:'A', sessions:{},
  exercises:{
    smith:{id:'smith',name:'Приседания в Смите',body:['Ноги','Ягодицы'],description:'Основное упражнение на ноги и ягодицы.',tile:0,cover:''},
    bridge:{id:'bridge',name:'Ягодичный мост с гантелью',body:['Ягодицы'],description:'Акцент на ягодицы.',tile:1,cover:''},
    curl:{id:'curl',name:'Сгибание ног в тренажёре',body:['Бёдра'],description:'Задняя поверхность бёдер.',tile:2,cover:''},
    row:{id:'row',name:'Горизонтальная тяга блока',body:['Спина'],description:'Спина.',tile:3,cover:''},
    chest:{id:'chest',name:'Жим от груди в тренажёре',body:['Грудь','Трицепсы'],description:'Грудные мышцы и трицепсы.',tile:4,cover:''},
    biceps:{id:'biceps',name:'Сгибание рук на нижнем блоке',body:['Бицепс'],description:'Бицепс.',tile:5,cover:''},
    extension:{id:'extension',name:'Разгибание ног в тренажёре',body:['Бёдра'],description:'Передняя поверхность бёдер.',tile:6,cover:''},
    abduction:{id:'abduction',name:'Разведение ног в тренажёре',body:['Ягодицы'],description:'Ягодичные мышцы.',tile:7,cover:''},
    pulldown:{id:'pulldown',name:'Тяга верхнего блока к груди',body:['Спина'],description:'Широчайшие мышцы спины.',tile:8,cover:''},
    lateral:{id:'lateral',name:'Разведения гантелей в стороны',body:['Плечи'],description:'Плечи.',tile:9,cover:''},
    triceps:{id:'triceps',name:'Разгибание руки с гантелью в наклоне',body:['Трицепс'],description:'Трицепс. Повторения указаны на каждую руку.',tile:10,cover:''},
    romanian:{id:'romanian',name:'Румынская тяга с гантелями',body:['Бёдра','Ягодицы'],description:'Задняя поверхность бёдер и ягодицы. По самочувствию. Только если поясница не беспокоит и техника уверенная; иначе заменим.',tile:11,cover:''}
  },
  plans:{
    A:{name:'Тренировка А',focus:'Ноги и ягодицы',items:[
      {exerciseId:'smith',sets:'3',reps:'10–12'},
      {exerciseId:'bridge',sets:'3',reps:'10–12'},
      {exerciseId:'curl',sets:'2',reps:'12'},
      {exerciseId:'row',sets:'3',reps:'10–12'},
      {exerciseId:'chest',sets:'2',reps:'10–12'},
      {exerciseId:'biceps',sets:'2',reps:'10–12'}
    ]},
    B:{name:'Тренировка Б',focus:'Верх тела',items:[
      {exerciseId:'extension',sets:'3',reps:'12'},
      {exerciseId:'abduction',sets:'3',reps:'12–15'},
      {exerciseId:'pulldown',sets:'3',reps:'10–12'},
      {exerciseId:'chest',sets:'3',reps:'10–12'},
      {exerciseId:'lateral',sets:'2',reps:'12–15'},
      {exerciseId:'triceps',sets:'2',reps:'10–12 на руку'},
      {exerciseId:'romanian',sets:'2',reps:'10–12',optional:true}
    ]}
  }
};
