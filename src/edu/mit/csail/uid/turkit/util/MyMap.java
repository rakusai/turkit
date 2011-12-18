
package edu.mit.csail.uid.turkit.util;

import java.util.HashMap;

public class MyMap<K, V> extends HashMap<K, V> {
    Class defaultValue;
    
    public MyMap(Class defaultValue) {
        this.defaultValue = defaultValue;
    }
    
    public V get(Object o) {
        K k = (K)o;
        try {
            V v = super.get(k);
            if (v == null) {            
                v = (V)defaultValue.newInstance();
                put(k, v);
            }
            return v;
        } catch (Exception e) {
            throw new IllegalArgumentException(e);
        }
    }
}
