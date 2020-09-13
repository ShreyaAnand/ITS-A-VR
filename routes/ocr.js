const router = require('express').Router();
const multer = require("multer");
var uploads = multer({dest:'uploads/'});

const fs = require('fs');
const vision = require('@google-cloud/vision');
const toneAnalyzer = require("watson-developer-cloud/tone-analyzer/v3");
const toneobj = require('../secret').t_analyser;

const PDFImage = require("pdf-image").PDFImage;

//creates a client
const client = new vision.ImageAnnotatorClient();




function pdf_to_png(file,pgno=0){
    return new Promise((resolve,reject)=>{
       var pdfimage = new PDFImage(file);
        pdfimage.convertPage(pgno)
        .then((filepath)=>{
          resolve(filepath)
        })
        .catch((err)=>{
            console.log(err);
            reject(err);
        });
    })
}










function analyze(text){
    return new Promise((resolve,reject)=>{
        var tone_analyzer = new toneAnalyzer(toneobj);
  var params = {
          'tone_input': text,
          'content_type': 'text/plain'
        };


        tone_analyzer.tone(params,(err,response)=>{
            if(err) reject(err);
            else resolve(JSON.stringify(response,null,2));
        });
    });


}


router.post('/',uploads.single('file'), (req,res,next)=>{
  //  console.log(req.file);

    if(req.file === undefined){
        var err = new Error('error');
        next(err);
    }

     pdf_to_png(req.file.path)
     .then((filepath)=>{


        client
      .textDetection(filepath)
      .then((results) => {
    //    console.log(JSON.stringify(results));
        const detections = results[0].textAnnotations;
        var text = '';
        detections.forEach((datta) => {
            text+=datta.description+' ';

        });
        req.session.file = req.file.path;
        //shell.rm(req.file.path);
        fs.unlinkSync(filepath);

        analyze(text)
        .then((txt)=>{
          var i=0;
          var data='';
          var tone = JSON.parse(txt).document_tone.tones[0].tone_name;
          console.log(tone);
          var response={text:text,analysis:tone};
         res.render('vr',response);
        })
        .catch(err=>next(err));

      })
      .catch(err => {
        next(err);
      });


   }).catch(err=>res.send(err));




});





router.get('/:p',(req,res)=>{

    pdf_to_png(req.session.file,req.params.p)
    .then((filepath)=>{


       client
     .textDetection(filepath)
     .then((results) => {
   //    console.log(JSON.stringify(results));
       const detections = results[0].textAnnotations;
       var text = '';
       detections.forEach((datta) => {
           text+=datta.description+' ';

       });
       //shell.rm(req.file.path);
       shell.rm(filepath);
       analyze(text)
       .then((txt)=>{
         var i=0;
         var data='';
         var response={text:text,analysis:JSON.parse(txt).document_tone.tones[0].tone_name};
        res.render('vr',response);
       })
       .catch(err=>next(err));

     })
     .catch(err => {
       res.json({err});
     });


  }).catch(err=>res.send(err));


});



module.exports = router;
