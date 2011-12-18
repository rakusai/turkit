
package edu.mit.csail.uid.turkit.util;

import java.util.Collections;
import java.util.HashMap;
import java.util.Set;
import java.util.Vector;

// ********* ********* ********* ********* ********* ********* ********* ********* ********* ********* ********* *********

public class Bag<V> {

	 public HashMap<V, Double> map = new HashMap();

	 public Double add(V v, double amount) {
	   Double i = map.get(v);
	   if (i == null) {
	     i = 0.0;
	   }
	   i = i + amount;
	   map.put(v, i);
	   return i;
	 }

	 public Double add(V v) {
	   return add(v, 1);
	 }

	 public Double remove(V v) {
	   return add(v, -1);
	 }

	 public Double get(V v) {
	   return map.get(v);
	 }

	 public Set<V> keySet() {
	   return map.keySet();
	 }

	 public Vector<Pair<Double, V>> getPairs() {
	   Vector<Pair<Double, V>> pairs = new Vector<Pair<Double, V>>();
	   for (V v : map.keySet()) {
	     pairs.add(new Pair<Double, V>(get(v), v));
	   }
	   return pairs;
	 }

	 public Vector<Pair<Double, V>> getSortedPairs() {
	   Vector<Pair<Double, V>> pairs = getPairs();
	   Collections.sort(pairs, Collections.reverseOrder());
	   return pairs;
	 }
	}
