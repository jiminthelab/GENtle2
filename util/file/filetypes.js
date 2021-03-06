/**
	Filetype base class
	@class
*/
function Filetype () {
	this.fileTypeValidated = false ;
	this.typeName = 'none' ;
}

Filetype.prototype._shl = function (a, b){
        for (++b; --b; a = ((a %= 0x7fffffff + 1) & 0x40000000) == 0x40000000 ? a * 2 : (a - 0x40000000) * 2 + 0x7fffffff + 1);
        return a;
    }

Filetype.prototype.stringToBytes = function ( str ) {
/*
  var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
  var bufView = new Uint8Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  
  console.log ( bufView ) ;
  
  return buf;
*/
	var re = [] ;
	for ( var i = 0 ; i < str.length ; i++ ) re.push ( this._shl ( str.charCodeAt(i) ) ) ;
	return re ;
/*  var ch, st, re = [];
  for (var i = 0; i < str.length; i++ ) {
    ch = str.charCodeAt(i);  // get char 
    st = [];                 // set up "stack"
    do {
      st.push( ch & 0xFF );  // push byte to stack
      ch = ch >> 8;          // shift value down by 1 byte
    }  
    while ( ch );
    // add stack contents to result
    // done because chars have "wrong" endianness
    re = re.concat( st.reverse() );
  }
  // return an array of bytes
  return re;*/
}

/**
	Checks if a file matches this filetype, and then parses it. Does not return a result, but informs the gentle object that a match was found.
	@param {file} f The file.
	
*/
Filetype.prototype.checkFile = function ( f ) {
	this.file = f ;
	var reader = new FileReader();
	var meh = this ;
	
	// Closure to capture the file information.
	reader.onload = (function(theFile) {
		return function(e) {
			if ( f.isIdentified ) return ;
//			console.log ( e.target.result.split(||) ) ;
			meh.text = e.target.result ;
			if ( !meh.textHeuristic() ) return ;
			f.isIdentified = true ;
			meh.fileTypeValidated = true ;
			gentle.fileLoaded ( meh ) ;
			meh.parseFile () ;
		};
	})(f);
	
	// Read in the image file as a data URL.
	if ( this.read_binary ) reader.readAsArrayBuffer ( f ) ;
	else reader.readAsText(f);
}

/**
	Returns a string for file export.
	@return {string} The string representing the sequence.
*/
Filetype.prototype.getExportString = function ( sequence ) {
	return '' ;
}

Filetype.prototype.getExportBlob = function ( sequence ) {
	var ret = { error : false } ;
	
	var t = this.getExportString ( sequence ) ;

	if ( t == '' ) {
		ret.error = true ;
		return ret ;
	}

	ret.filetype = "text/plain;charset=utf-8" ;

	try {
		var dt = [ t ] ;
		ret.blob = new Blob ( dt , { type:"text/plain;charset=utf-8" } ) ;
	} catch ( e ) {
		var b = getBlobBuilder() ;
		b.append ( t ) ;
		ret.blob = b.getBlob ( ret.filetype ) ;
	}

	if ( undefined === ret.blob ) return { error : true } ; // Paranoia

	
	return ret ;
}

/**
	Checks if a given file matches the filetype.
	@returns {bool} True if the file matches, false if not.
*/
Filetype.prototype.textHeuristic = function () {
	return false ;
}

Filetype.prototype.checkText = function ( text ) {
	this.text = text ;
	if ( !this.textHeuristic() ) return false ;
	this.fileTypeValidated = true ;
	gentle.fileLoaded ( this ) ;
	this.parseFile () ;
	return true ;
}

Filetype.prototype.parseFile = function () {
	console.log ( "Filetype.parseFile should never be called!" ) ;
	return [] ;
}

Filetype.prototype.parseText = function () {
	console.log ( "Filetype.parseText should never be called!" ) ;
}

Filetype.prototype.getFileExtension = function () {
	return '' ;
}


//________________________________________________________________________________________
// Plain text
FT_plaintext.prototype = new Filetype() ;

/**
	Implements a plain text DNA file reader/writer.
	@class FT_plaintext
	@extends Filetype
*/
FT_plaintext.prototype.constructor = FT_plaintext ;

FT_plaintext.prototype.getFileExtension = function () {
	return 'txt' ;
}

FT_plaintext.prototype.getExportString = function ( sequence ) {
	var ret = '' ;
	var s = sequence.seq ;
	while ( s != '' ) {
		ret += s.substr ( 0 , 60 ) + "\n" ;
		s = s.substr ( 60 , s.length-60 ) ;
	}
	return ret ;
}

FT_plaintext.prototype.parseFile = function () {
	var ret = [] ;
	var seqtext = this.text.replace ( /[^a-z]/gi , '' ).toUpperCase() ;
	var name = 'Unnamed sequence' ;
	if ( this.file !== undefined ) name = ucFirst ( this.file.name ) ;
	var v = new SequenceDNA ( name , seqtext ) ;
	var seqid = gentle.addSequence ( v , true ) ;
	ret.push ( seqid ) ;
	return ret ;
}

FT_plaintext.prototype.textHeuristic = function () {
	if ( this.text.match ( /[^a-zA-Z0-0\s]/ ) ) return false ;
	return true ;
}

function FT_plaintext () {
	this.typeName = 'plaintext' ;
}

//________________________________________________________________________________________
// FASTA

FT_fasta.prototype = new Filetype() ;

/**
	Implements a FASTA file reader/writer.
	@class FT_fasta
	@extends Filetype
*/
FT_fasta.prototype.constructor = FT_fasta ;

FT_fasta.prototype.getFileExtension = function () {
	return 'fasta' ;
}

FT_fasta.prototype.getExportString = function ( sequence ) {
	var ret = '' ;
	ret += ">" + sequence.name + "\n" ;
	var s = sequence.seq ;
	while ( s != '' ) {
		ret += s.substr ( 0 , 60 ) + "\n" ;
		s = s.substr ( 60 , s.length-60 ) ;
	}
	return ret ;
}

FT_fasta.prototype.parseFile = function () {
	var ret = [] ;
	var lines = this.text.replace(/\r/g,'').split ( "\n" ) ;
	var name = '' ;
	var seq = '' ;
	var tempseq = [] ;
	$.each ( lines , function ( k , v ) {
		if ( v.match ( /^>/ ) ) {
			if ( seq != '' ) tempseq.push ( new SequenceDNA ( name , seq ) ) ;
			name = v.replace ( /^>\s*/ , '' ) ;
			seq = '' ;
		} else {
			seq += v.replace ( /\s/g , '' ).toUpperCase() ;
		}
	} ) ;
	if ( seq != '' ) tempseq.push ( new SequenceDNA ( name , seq ) ) ;
	
	$.each ( tempseq , function ( k , v ) {
		var seqid = gentle.addSequence ( v , true ) ;
		ret.push ( seqid ) ;
	} ) ;
	return ret ;
}

FT_fasta.prototype.textHeuristic = function () {
	if ( this.text.match ( /^\>/ ) ) return true ;
	return false ;
}

function FT_fasta () {
	this.typeName = 'FASTA' ;
}



//________________________________________________________________________________________
// SCF
// See file type doc here: http://staden.sourceforge.net/manual/formats_unix_3.html#SEC3
// For V3.1 RfC, see http://staden.sourceforge.net/scf-rfc.html

FT_scf.prototype = new Filetype() ;

/**
	Implements a SCF file reader/writer.
	@class FT_fasta
	@extends Filetype
*/
FT_scf.prototype.constructor = FT_scf ;

FT_scf.prototype.getBigEndianUnsignedWord = function ( bytes , p ) {
	var n1 = bytes[p+0] * 256 + bytes[p+1] ;
	return n1 ;
}

FT_scf.prototype.getBigEndianSignedWord = function ( bytes , p ) {
	var x = bytes[p+0] * 256 + bytes[p+1] ;
	return x >= 32768 ? x-65536 : x ;
}

FT_scf.prototype.getBigEndianUnsignedLong = function ( bytes , p ) {
	var n1 = bytes[p+0] *256*256*256 + bytes[p+1] *256*256 + bytes[p+2] * 256 + bytes[p+3] ;
	return n1 ;
}

FT_scf.prototype.getFileExtension = function () {
	return 'scf' ;
}

FT_scf.prototype.getExportString = function ( sequence ) {
	return 'NOT IMPLEMENTED YET';
}

/*
FT_scf.prototype.us2s = function ( x ) { // Unsigned to signed byte
	return x >= 128 ? x-256 : x ;
}
*/

FT_scf.prototype.parseFile = function ( just_check_format ) {
	var me = this ;

	// START SCF PARSING HERE

	var me_text = String.fromCharCode.apply(null, new Uint16Array(me.text)) ;
	var bytes = new Uint8Array(me.text);
	

	// HEADER
	var p = 0 ;
	var scf = {} ;
	scf.magic_number = String.fromCharCode ( bytes[p++] ) + 
					String.fromCharCode ( bytes[p++] ) +
					String.fromCharCode ( bytes[p++] ) +
					String.fromCharCode ( bytes[p++] ) ;

	if ( scf.magic_number != '.scf' ) return false ;
	if ( just_check_format ) return true ;

	scf.samples = me.getBigEndianUnsignedLong ( bytes , p ) ; p += 4 ; // Number of raw data points
	scf.samples_offset = me.getBigEndianUnsignedLong ( bytes , p ) ; p += 4 ;
	scf.bases = me.getBigEndianUnsignedLong ( bytes , p ) ; p += 4 ;
	scf.bases_left_clip = me.getBigEndianUnsignedLong ( bytes , p ) ; p += 4 ;
	scf.bases_right_clip = me.getBigEndianUnsignedLong ( bytes , p ) ; p += 4 ;
	scf.bases_offset = me.getBigEndianUnsignedLong ( bytes , p ) ; p += 4 ;
	scf.comments_size = me.getBigEndianUnsignedLong ( bytes , p ) ; p += 4 ;
	scf.comments_offset = me.getBigEndianUnsignedLong ( bytes , p ) ; p += 4 ;
	
	scf.version = String.fromCharCode ( bytes[p++] ) + 
					String.fromCharCode ( bytes[p++] ) +
					String.fromCharCode ( bytes[p++] ) +
					String.fromCharCode ( bytes[p++] ) ;
	scf.num_version = scf.version * 1 ;
	
	scf.sample_size = me.getBigEndianUnsignedLong ( bytes , p ) ; p += 4 ; // 2=two bytes
	scf.code_set = me.getBigEndianUnsignedLong ( bytes , p ) ; p += 4 ;
	scf.private_size = me.getBigEndianUnsignedLong ( bytes , p ) ; p += 4 ;
	scf.private_offset = me.getBigEndianUnsignedLong ( bytes , p ) ; p += 4 ;
	
	for ( var i = 0 ; i < 18 ; i++ ) {
		var dummy = me.getBigEndianUnsignedLong ( bytes , p ) ; p += 4 ;
	}
	
	
	if ( scf.num_version >= 3 ) { // V 3.0 and above
	
		var bytesize = scf.num_version == 1 ? 1 : 2 ;
		scf.data = [] ; // Raw point data
		var p = scf.samples_offset ;
		var chunksize = scf.sample_size * scf.samples ; // Offsets for C, G, T
		for ( var point = 0 ; point < scf.samples ; point++ ) {
			var o = {
				A : me.getBigEndianSignedWord ( bytes , p+chunksize*0 ) ,
				C : me.getBigEndianSignedWord ( bytes , p+chunksize*1 ) ,
				G : me.getBigEndianSignedWord ( bytes , p+chunksize*2 ) ,
				T : me.getBigEndianSignedWord ( bytes , p+chunksize*3 )
			} ;
			scf.data[point] = o ;
			p += scf.sample_size ;
		}

		// Applying diff
		var num_samples = scf.samples ;
		$.each ( ['A','C','G','T'] , function ( dummy , base ) {
			var p_sample = 0 ;
			for (var i=0;i<num_samples;i++) {
				scf.data[i][base] += p_sample ;
				p_sample = scf.data[i][base] ;
			}
			var p_sample = 0 ;
			for (var i=0;i<num_samples;i++) {
				scf.data[i][base] += p_sample ;
				p_sample = scf.data[i][base] ;
			}
		} ) ;

		// Bases
		p = scf.bases_offset ;
		scf.base_data = [] ;
		for ( var base = 0 ; base < scf.bases ; base++ ) {
			scf.base_data[base] = {
				index : me.getBigEndianUnsignedLong ( bytes , p+base*4 ) ,
				prob_A : bytes[p+scf.bases*4+base] ,
				prob_C : bytes[p+scf.bases*5+base] ,
				prob_G : bytes[p+scf.bases*6+base] ,
				prob_T : bytes[p+scf.bases*7+base] ,
				base : String.fromCharCode ( bytes[p+scf.bases*8+base] )
			} ;
		}

	
	} else { // V 1.0 or 2.0
		
		// Points
		scf.data = [] ; // Raw point data
		
		var p = scf.samples_offset ;
		for ( var point = 0 ; point < scf.samples ; point++ ) {
			var o = {} ;
			if ( scf.sample_size == 1 ) { // V1; untested. Does it exist in the wild?
				o =  {
					A : bytes[p+0] ,
					C : bytes[p+1] ,
					G : bytes[p+2] ,
					T : bytes[p+3]
					} ;
			} else { // V2
				o.A = me.getBigEndianUnsignedWord ( bytes , p+0 ) ;
				o.C = me.getBigEndianUnsignedWord ( bytes , p+2 ) ;
				o.G = me.getBigEndianUnsignedWord ( bytes , p+4 ) ;
				o.T = me.getBigEndianUnsignedWord ( bytes , p+6 ) ;
			}
			scf.data[point] = o ;
			p += 4 * scf.sample_size ;
		}
		
		// Bases
		p = scf.bases_offset ;
		scf.base_data = [] ;
		for ( var base = 0 ; base < scf.bases ; base++ ) {
			scf.base_data[base] = {
				index : me.getBigEndianUnsignedLong ( bytes , p ) ,
				prob_A : bytes[p+4] ,
				prob_C : bytes[p+5] ,
				prob_G : bytes[p+6] ,
				prob_T : bytes[p+7] ,
				base : String.fromCharCode ( bytes[p+8] ) // Plus 3 blank spare
			} ;
			p += 12 ;
		}
		
	}

	// Highest peak
	scf.max_data = 0 ;
	for ( var point = 0 ; point < scf.samples ; point++ ) {
		$.each ( ['A','C','G','T'] , function ( dummy , base ) {
			if ( scf.max_data < scf.data[point][base] ) scf.max_data = scf.data[point][base] ;
		} ) ;
	}
	
	// PARSING INCOMPLETE! Private data, comments not parsed

	


	// END SCF PARSING
	
	// NOW TURNING SCF OBJECT INTO OVERSIMPLIFIED DISPLAY STRUCTURE
	
	var max = 1000 ; // scf.max_data
	var n = scf.num_version >= 3 ? 10 : 10 ;
	var tempseq = [] ;
	$.each ( scf.base_data , function ( k , v ) {
		var d = scf.data[v.index] ;
		var o = {
			A : (d.A > max ? max : d.A)/n ,
			C : (d.C > max ? max : d.C)/n  ,
			G : (d.G > max ? max : d.G)/n  ,
			T : (d.T > max ? max : d.T)/n  ,
			base : v.base
		} ;
		tempseq.push ( o ) ;
	} ) ;

	var ret = [] ;
	var seqtext = '';

	for (i in tempseq) {
		seqtext += tempseq[i]['base'];
	}

	var name = "Chromatogram" ;
	var v = new SequenceDNA ( name , seqtext, tempseq ) ;
	v.scf = scf ; // KEEP THE FULL, PARSED DATA
	var seqid = gentle.addSequence ( v , true ) ;
	ret.push ( seqid ) ;
	return ret ;
}

FT_scf.prototype.textHeuristic = function () {
	return this.parseFile ( true ) ;
}

function FT_scf () {
	this.typeName = 'SCF' ;
	this.read_binary = true ;
}




//________________________________________________________________________________________
// SCF2JSON

FT_scf2json.prototype = new Filetype() ;

/**
	Implements a SCF2JSON file reader/writer.
	@class FT_fasta
	@extends Filetype
*/
FT_scf2json.prototype.constructor = FT_scf2json ;

FT_scf2json.prototype.getFileExtension = function () {
	return 'scf2json' ;
}

FT_scf2json.prototype.getExportString = function ( sequence ) {
	return 'NOT IMPLEMENTED YET';
}

FT_scf2json.prototype.parseFile = function () {
	var ret = [] ;
	var tempseq = $.parseJSON(this.text);

	var seqtext = '';

	for (i in tempseq) {
		seqtext += tempseq[i]['base'];
	}

	var v = new SequenceDNA ( name , seqtext, tempseq ) ;
	var seqid = gentle.addSequence ( v , true ) ;
	ret.push ( seqid ) ;
	return ret ;
}

FT_scf2json.prototype.textHeuristic = function () {
	if ( this.text.match ( /^\[\{/ ) ) return true ;
	return false ;
}

function FT_scf2json () {
	this.typeName = 'SCF2JSON' ;
}




//________________________________________________________________________________________
// GeneBank
FT_genebank.prototype = new Filetype() ;

/**
	Implements a GenBank format file reader/writer.
	@class FT_genebank
	@extends Filetype
*/
FT_genebank.prototype.constructor = FT_genebank ;

FT_genebank.prototype.textHeuristic = function () {
	if ( this.text.match ( /^LOCUS\s+/i ) ) return true ;
	return false ;
}


FT_genebank.prototype.parseText = function ( text ) {
	this.text = text ;
	this.fileTypeValidated = true ;
//	$('#sb_log').append ( '<p>GenBank text loaded</p>' ) ;
	this.parseFile () ;
}

FT_genebank.prototype.parseFile = function () {
	var ret = [] ;
	var lines = this.text.replace(/\r/g,'').split ( "\n" ) ;

	var mode = '' ;
	var seq = new SequenceDNA ( '' , '' ) ;
	seq.desc = '' ;
	var feature = {} ;
	$.each ( lines , function ( k , v ) {

		if ( v.match(/^LOCUS/i) ) {
			var m = v.match(/^LOCUS\s+(\S+)\s+(.+)$/i)
			seq.name = m[1] ;
			seq.is_circular = m[2].match(/\bcircular\b/i) ? true : false ;
			return ;
		} else if ( v.match(/^DEFINITION\s+(.+)$/i) ) {
			var m = v.match(/^DEFINITION\s+(.+)$/i) ;
			seq.name = m[1] ;
		} else if ( v.match(/^FEATURES/i) ) {
			mode = 'FEATURES' ;
			return ;
		} else if ( v.match(/^REFERENCE/i) ) {
			mode = 'REFERENCE' ;
			return ;
		} else if ( v.match(/^COMMENT\s+(.+)$/i) ) {
			mode = 'COMMENT' ;
			var m = v.match(/^COMMENT\s+(.+)$/i) ;
			seq.desc += m[1] + "\n" ;
			return ;
		} else if ( v.match(/^ORIGIN/i) ) {
			if ( feature['_last'] ) seq.features.push ( $.extend(true, {}, feature) ) ;
			mode = 'ORIGIN' ;
			return ;
		}
		
		if ( mode == 'FEATURES' ) { // Note that leading spaces have some "leeway"...
		
			var m = v.match ( /^\s{1,8}(\w+)\s+(.+)$/ ) ;
			if ( m ) { // Begin feature
				if ( feature['_last'] ) seq.features.push ( $.extend(true, {}, feature) ) ;
				feature = {} ;
				feature['_type'] = m[1] ;
				feature['_range'] = m[2] ;
				feature['_last'] = '_range' ;
				return ;
			}
			
			m = v.match ( /^\s{8,21}\/(\w+)\s*=\s*(.+)\s*$/ ) ;
			if ( m ) { // Begin new tag
				m[1] = m[1].replace ( /^"/ , '' ) ;
				feature['_last'] = m[1] 
				feature[m[1]] = m[2] ;
				return ;
			}
			
			m = v.match ( /^\s{18,21}\s*(.+)\s*$/ ) ;
			if ( m ) { // Extend tag
				//if ( null !== feature[feature['_last']].match(/^[A-Z]+$/) )
				m[1] = m[1].replace ( /"$/ , '' ) ;
				if ( m[1].match(/^[A-Z]+$/) === null ) feature[feature['_last']] += " " ;
				feature[feature['_last']] += m[1] ;
			}
		
		} else if ( mode == 'REFERENCE' ) {
			seq.desc += v + "\n" ;
		
		} else if ( mode == 'ORIGIN' ) {
		
			if ( v.match(/^\/\//) ) return false ; // The absolute end
			seq.seq += v.replace ( /[ 0-9]/g , '' ).toUpperCase() ;
			
		}
	} ) ;
	
	// Cleanup features
	$.each ( seq.features , function ( k , v ) {
		delete v['_last'] ;
		var range = [] ; // Default : Unknown = empty TODO FIXME
		var r = v['_range'] ;
		
		var m = r.match ( /^\d+$/ ) ;
		if ( m ) {
			range.push ( { from : r*1 , to : r*1 , rc : false } ) ;
			v['_range'] = range ;
			return ;
		}
		
		m = r.match ( /^(\d+)\.\.(\d+)$/ ) ;
		if ( m ) {
			range.push ( { from : m[1]*1 , to : m[2]*1 , rc : false } ) ;
			v['_range'] = range ;
			return ;
		}
		
		m = r.match ( /^complement\((\d+)\.\.(\d+)\)$/i ) ;
		if ( m ) {
			range.push ( { from : m[1]*1 , to : m[2]*1 , rc : true } ) ;
			v['_range'] = range ;
			return ;
		}
		
		console.log ( "Could not parse range " + r ) ;
		v['_range'] = range ;
	} ) ;
	
//	console.log ( JSON.stringify ( seq.features ) ) ;
	
	var seqid = gentle.addSequence ( seq , true ) ;
	ret.push ( seqid ) ;
	return ret ;
}

var ralign = function(str, length) {
	return (new Array(length - str.length)).join(' ') + str;
}

var lalign = function(str, length) {
	return str + (new Array(length - str.length)).join(' ') 
}

var splitEvery = function(str, length) {
	var output = [];
	for(var i = 0; i < str.length; i += length) {
		var temp = str.substr(i, length).split("\n");
		for(var j = 0; j < temp.length; j++) {
			output.push(temp[j]);
		}
	}
	return output
}

FT_genebank.prototype.getExportString = function ( sequence ) {
	var output = '';


	// Description

	// output += lalign('DEFINITION', 12);

	// console.log(sequence.desc)

	// var splitDescription = splitEvery(sequence.desc, 56);
	// output += splitDescription.shift();
	// output += splitDescription.join("\n" + leftSpaces('', 12));
	// output += "\n";


	// Sequence

	output += "ORIGIN\n";

	for(var i = 0; i < sequence.seq.length; i += 60) {
		var subseq = sequence.seq.substr(i, 60);

		output += ralign((i+1).toString(), 9) + ' ';

		for(var j = 0; j < 60; j += 10) {
			output += subseq.substr(j, 10).toLowerCase() + ' ';
		}

		output += "\n"
	}



	// The End

	output += '//';

	return output;
};


function FT_genebank () {
	this.typeName = 'GeneBank' ;
}


//________________________________________________________________________________________
// SYBIL - SYnthetic Biology Interchange Language
FT_sybil.prototype = new Filetype() ;

/**
	Implements a SyBIL (SYnthetic Biology Interchange Language) format file reader/writer.
	@class FT_sybil
	@extends Filetype
*/
FT_sybil.prototype.constructor = FT_sybil ;

FT_sybil.prototype.getFileExtension = function () {
	return 'sybil' ;
}

FT_sybil.prototype.getExportString = function ( sequence ) {
	var s = '' ;
	
	s += "<sybil>\n" ;
	s += "<session>\n" ;
	
	// TODO repo
	// TODO history
	
	s += "<circuit>\n" ;
	
	if ( '' != ( sequence.desc || '' ) ) {
		var o = $('<general_description></general_description>') ;
		o.text ( sequence.desc ) ;
		s += o.outerHTML() + "\n" ;
	}
	
	$.each ( sequence.features , function ( k , v ) {
		if ( v['_type'].match(/^source$/i) ) return ;
		if ( undefined === v['_range'] ) return ;
		if ( 0 == v['_range'].length ) return ;
		
		// Misc
		var type = v['_type'] ;
		var start = v['_range'][0].from ;
		var stop = v['_range'][v['_range'].length-1].to ;

		// Name
		var name = '' ;
		if ( v['gene'] !== undefined ) name = v['gene'] ;
		else if ( v['product'] !== undefined ) name = v['product'] ;
		else if ( v['name'] !== undefined ) name = v['name'] ;
		name = name.replace(/^"/,'').replace(/"$/,'') ;
		
		// Description
		var desc = '' ;
		if ( v['note'] !== undefined ) desc = v['note'] ;
		else if ( v['protein'] !== undefined ) desc = v['protein'] ;
		else if ( v['product'] !== undefined ) desc = v['product'] ;
		else if ( v['bound_moiety'] !== undefined ) desc = v['bound_moiety'] ;
		desc = desc.replace(/^"/,'').replace(/"$/,'') ;
		if ( desc != '' ) desc = "\n" + ucFirst ( desc ) ;
		desc = desc.trim() ;
		
		if ( 1 != v['_range'].length ) {
			$.each ( v['_range'] , function ( k2 , v2 ) {
				desc += "<exon start='" + v2.from + "' to='" + v2.to + "' />\n" ;
			} ) ;
		}
		
		var o = $('<annotation></annotation>') ;
		o.text ( desc ) ;
		o.attr ( 'rc' , v['_range'][0].rc ? 1 : 0 ) ;

		$.each ( v , function ( k2 , v2 ) {
			if ( k2.substr ( 0 , 1 ) == '_' ) return ;
			var k3 = k2.toLowerCase() ;
			if ( k3 == 'translation' ) return ;
			var v3 = v2.replace ( /\"/g , '' ) ;
			o.attr ( k2 , v3 ) ;
		} ) ;

		o.attr ( { type:type , start:start , stop:stop } ) ;
		if ( name != '' ) o.attr ( { name:name } ) ;

		s += o.outerHTML() + "\n" ;

	} ) ;
	
	var o = $("<sequence></sequence>") ;
	o.text ( sequence.seq ) ;
	o.attr( { type:'dna' , name:sequence.name } ) ;
	s += o.outerHTML() + "\n" ;
	
	s += "</circuit>\n" ;
	s += "</session>\n" ;
	s += "</sybil>" ;
	
	// TODO me should do some serious "illegal XML characters" filtering here, but...
	s = s.replace ( /\u0004/g , '' ) ;

	return s ;
}

FT_sybil.prototype.parseFile = function () {
	var ret = [] ;
	var sybil = $.parseXML(this.text) ;
	sybil = $(sybil) ;
	
	var tempseq = [] ;

	sybil.find('session').each ( function ( k1 , v1 ) {
		$(v1).find('circuit').each ( function ( k2 , v2 ) {
			var s = $(v2).find('sequence').get(0) ;
			s = $(s) ;
			var seq = new SequenceDNA ( s.attr('name') , s.text().toUpperCase() ) ;
			seq.desc = $(v2).find('general_description').text() ;
			
			seq.features = [] ;
			$(v2).find('annotation').each ( function ( k3 , v3 ) {
				var attrs = $(v3).listAttributes() ;
				var start , stop , rc ;
				var feature = {} ;
				feature['_range'] = [] ;
				feature.desc = $(v3).text() ; // TODO exons
				$.each ( attrs , function ( dummy , ak ) {
					var av = $(v3).attr(ak) ;
					if ( ak == 'start' ) start = av*1 ;
					else if ( ak == 'stop' ) stop = av*1 ;
					else if ( ak == 'rc' ) rc = ( av == 1 ) ;
					else if ( ak == 'type' ) feature['_type'] = av ;
					else feature[ak] = av ;
				} ) ;
				
				if ( feature['_range'].length == 0 ) {
					feature['_range'] = [ { from:start , to:stop , rc:rc } ] ;
				}
				
//				console.log ( JSON.stringify ( feature ) ) ;
				
				seq.features.push ( feature ) ;
			} ) ;
			
			tempseq.push ( seq ) ;
		} ) ;
	} ) ;
	
	
	$.each ( tempseq , function ( k , v ) {
		var seqid = gentle.addSequence ( v , true ) ;
		ret.push ( seqid ) ;
	} ) ;

	return ret ;
}

FT_sybil.prototype.textHeuristic = function () {
	if ( this.text.match ( /^<sybil\b/i ) ) return true ;
	return false ;
}


function FT_sybil () {
	this.typeName = 'SYBIL' ;
}




//________________________________________________________________________________________
// Clone Manager CM5
FT_cm5.prototype = new Filetype() ;


/**
	Implements a CloneManager (CM5) format file reader.
	@class FT_cm5
	@extends Filetype
*/
FT_cm5.prototype.constructor = FT_cm5 ;

FT_cm5.prototype.textHeuristic = function () {
	return this.parseFile ( true ) ;
}


FT_cm5.prototype.parseText = function ( text ) {
	this.text = text ;
	this.fileTypeValidated = true ;
//	$('#sb_log').append ( '<p>GenBank text loaded</p>' ) ;
	this.parseFile () ;
}

FT_cm5.prototype.getLittleEndianUnsignedLong = function ( bytes , p ) {
	var n1 = bytes[p+1] * 256 + bytes[p+0] ;
	var n2 = bytes[p+2] * 256 + bytes[p+3] ;
//	n2 *= 65536 ;
	console.log ( "!" + n2 ) ;
	return n1 ;
//	return n2 * 65536 + n1 ;
}

FT_cm5.prototype.getLittleEndianUnsignedWord = function ( bytes , p ) {
	var n1 = bytes[p+1] * 256 + bytes[p+0] ;
	return n1 ;
}

FT_cm5.prototype.parseFile = function ( heuristic ) {
	var me = this ;
	var me_text = String.fromCharCode.apply(null, new Uint16Array(me.text)) ;
	if ( me_text.substr(0,1) >= '0' && me_text.substr(0,1) <= '9' ) return false ; // HACK prevent error "Uncaught RangeError: ArrayBufferView size is not a small enough positive integer. "
	var bytes = new Uint8Array(me.text);
	if ( bytes[0] != 26 || bytes[1] != 83 || bytes[2] != 69 || bytes[3] != 83 ) return false ; // CHECK HEURISTIC!
	
	var seq = new SequenceDNA ( '' , '' ) ;
	seq.desc = '' ;

	var feat_start = [] ;
	for ( var p = 4 ; p < bytes.length ; p++ ) {
		if ( bytes[p-3] != 255 || bytes[p-2] != 255 || bytes[p-1] != 0 || bytes[p] != 0 ) continue ;
		feat_start.push ( p+5 ) ;
	}
	
	var seq_start ;
	seq.features = [] ;
	$.each ( feat_start , function ( dummy , p ) {
		var type = '' ;
		while ( bytes[p] > 0 ) type += String.fromCharCode ( bytes[p++] ) ;
		if ( type == '' || type == 'source' ) return ;
		p++ ;
		p += 4 ; // Dunno what this is
		var from = me.getLittleEndianUnsignedWord ( bytes , p ) ;
		p += 4 ; // Skipping two bytes
		var to = me.getLittleEndianUnsignedWord ( bytes , p ) ;
		if ( from == 0 && to == 0 ) return ;
		p += 4 ; // Skipping two bytes
		p += 4 ; // Dunno what this is

		var shortname = '' ;
		while ( bytes[p] > 0 ) shortname += String.fromCharCode ( bytes[p++] ) ;
		p++ ;
		var name = '' ;
		while ( bytes[p] > 0 ) name += String.fromCharCode ( bytes[p++] ) ;
		p++ ;
		seq_start = p ;
		
		var rc = to < from ;
		if ( rc ) { var i = from ; from = to ; to = i ; }
		
		var feature = {} ;
		feature.name = shortname ;
		feature.desc = name ;
		feature['_range'] = [ { from:from , to:to , rc:rc } ] ;
		feature['_type'] = gentle.getFeatureType ( type ) ;
		seq.features.push ( feature ) ;
		
//		console.log ( type + " : " + from + "-" + to + (rc?" RC":"") + " [" + shortname + "] " + name ) ;
	} ) ;
	
	// Actual sequence
	var p ;
	for ( p = seq_start ; bytes[p] > 0 ; p++ ) seq.seq += String.fromCharCode ( bytes[p] ) ;
	p++ ;
	
	var number_of_enzymes = me.getLittleEndianUnsignedWord ( bytes , p ) ;
	p += 4 ; // Skipping two bytes
	var enzymes = [] ;
	for ( var i = 0 ; i < number_of_enzymes ; i++ ) {
		var s = '' ;
		while ( bytes[p] > 0 ) s += String.fromCharCode ( bytes[p++] ) ;
		p++ ;
		enzymes.push ( s ) ;
	}
	// TODO somehow use enzymes
	
	p = bytes.length - 2 ;
	while ( bytes[p] > 0 ) p-- ;
	p-- ;
	while ( bytes[p] > 0 ) p-- ;
	p++ ;
	
	while ( bytes[p] > 0 ) seq.name += String.fromCharCode ( bytes[p++] ) ;
	p++ ;
	while ( bytes[p] > 0 ) seq.desc += String.fromCharCode ( bytes[p++] ) ;
	
	if ( !heuristic ) gentle.addSequence ( seq , true ) ;
	return true ;
}

FT_cm5.prototype.getExportString = function ( sequence ) { // TODO
	return '' ;
}


function FT_cm5 () {
	this.typeName = 'Clone Manager' ;
	this.read_binary = true ;
}


//________________________________________________________________________________________
// Clone Manager CM5 Text
FT_cm5_text.prototype = new Filetype() ;


/**
	Implements a CloneManager (CM5) format file reader.
	@class FT_cm5_text
	@extends Filetype
*/
FT_cm5_text.prototype.constructor = FT_cm5_text ;

FT_cm5_text.prototype.textHeuristic = function () {
	return this.parseFile ( true ) ;
}


FT_cm5_text.prototype.parseText = function ( text ) {
	this.text = text ;
	this.fileTypeValidated = true ;
//	$('#sb_log').append ( '<p>GenBank text loaded</p>' ) ;
	this.parseFile () ;
}

FT_cm5_text.prototype.parseFile = function ( heuristic ) {
	var lines = this.text.replace(/\r/g,'').split ( "\n" ) ;
	if ( lines.length < 2 ) return false ;
	
	var seq = new SequenceDNA ( lines.shift() , '' ) ;
	seq.desc = '' ;
	
	if ( lines.length == 0 || !lines[0].match(/^\d+$/) ) return false ;
	var seqlen = lines.shift() * 1 ;
	
	if ( lines.length == 0 || !lines[0].match(/^\d+$/) ) return false ;
	var number_of_enzymes = lines.shift() * 1 ;
	
	var enzymes = {} ;
	for ( var i = 0 ; i < number_of_enzymes ; i++ ) {
		enzymes[lines.shift()] = 1 ;
		if ( lines.length == 0 || !lines[0].match(/^\d+$/) ) return false ;
		lines.shift() ; // Position of cut, apparently; irrelevant
	}
	
	if ( lines.length == 0 || !lines[0].match(/^\d+$/) ) return false ;
	var number_of_features = lines.shift() * 1 ;
	
	seq.features = [] ;
	for ( var i = 0 ; i < number_of_features ; i++ ) {
		var feature = {} ;
		var name_desc = lines.shift() ;
		var m = name_desc.match ( /^(.+)\x00(.*)$/ ) ;
		
		feature['name'] = m[1] || '' ;
		feature['desc'] = m[2] || '' ;
		feature['_range'] = [] ;
		if ( feature['desc'].match(/\bterminator\b/i) ) feature['_type'] = 'terminator' ;
		else if ( feature['desc'].match(/\bpromoter\b/i) ) feature['_type'] = 'promoter' ;
		else if ( feature['desc'].match(/\bcds\b/i) ) feature['_type'] = 'cds' ;
		else if ( feature['desc'].match(/\bcoding sequence\b/i) ) feature['_type'] = 'cds' ;
		else if ( feature['desc'].match(/\bgene\b/i) ) feature['_type'] = 'gene' ;
		else if ( feature['desc'].match(/\brbs\b/i) ) feature['_type'] = 'rbs' ;
		else feature['_type'] = 'misc' ;

		if ( lines.length == 0 || !lines[0].match(/^\d+$/) ) return false ;
		var start = lines.shift() * 1 ;
		if ( lines.length == 0 || !lines[0].match(/^\d+$/) ) return false ;
		var stop = lines.shift() * 1 ;
		var dir = lines.shift() ;
		var rc = (dir=='ccw') ;
		feature['_range'].push ( { from:(rc?stop:start) , to:(rc?start:stop) , rc:rc } ) ;
		
		lines.shift() ; // TODO unknown row, seems to be always "N"
		seq.features.push ( feature ) ;
	}
	
	// Don't know what these are...
	if ( lines.length == 0 || !lines[0].match(/^\d+$/) ) return false ;
	var number_of_unknown_things = lines.shift() * 1 ;
	
	for ( var i = 0 ; i < number_of_unknown_things ; i++ ) {
		lines.shift() ;

		if ( lines.length == 0 || !lines[0].match(/^\d+$/) ) return false ;
		var pos = lines.shift() * 1 ;
		
		lines.shift() ; // TODO what is that?
	}
	
	if ( lines.length < 2 || lines[0] != 'sequence' ) return false ;
	lines.shift() ;
	seq.seq = lines.shift().toUpperCase() ;
	if ( seq.seq.length != seqlen ) return false ;
	
	$.each ( lines , function ( k , v ) {
		if ( v == 'description' || v == 'annotations' ) return ;
		if ( v[0] != ';' && seq.desc.length > 0 ) seq.desc += "\n" ;
		seq.desc += v ;
	} )
	
	if ( !heuristic ) gentle.addSequence ( seq , true ) ;
	return true ;
}


FT_cm5_text.prototype.getExportString = function ( sequence ) { // TODO
	return '' ;
}


function FT_cm5_text () {
	this.typeName = 'Clone Manager 5, text' ;
}
